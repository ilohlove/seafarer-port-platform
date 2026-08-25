import type { User as SupabaseUser } from "@supabase/supabase-js";

import type {
  AuthRepository,
  AuthStateChange,
  ProfileUpdate,
} from "../contracts/auth-repository";
import type { RequestOptions } from "../contracts/request-context";
import { ServiceError, ValidationError } from "../service-errors";
import type { ProfileReadModel, UserRole } from "../../types";
import { getSupabaseClient, hasSupabaseConfig } from "./supabase-client";

function fallbackProfile(user: SupabaseUser): ProfileReadModel {
  const metadata = user.user_metadata as Record<string, unknown>;
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : "";
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined;

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName,
    avatarUrl,
    role: "member",
  };
}

function mapProfile(user: SupabaseUser, value: unknown): ProfileReadModel {
  const fallback = fallbackProfile(user);
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return fallback;
  }

  const record = row as Record<string, unknown>;
  const role = record.role;
  const safeRole: UserRole =
    role === "admin" || role === "moderator" ? role : "member";

  return {
    ...fallback,
    fullName:
      typeof record.full_name === "string" ? record.full_name : fallback.fullName,
    nickname:
      typeof record.nickname === "string" && record.nickname.length > 0
        ? record.nickname
        : undefined,
    role: safeRole,
  };
}

export class UnavailableAuthRepository implements AuthRepository {
  isConfigured(): boolean {
    return false;
  }

  async getState(): Promise<AuthStateChange> {
    return { status: "anonymous" };
  }

  subscribe(): () => void {
    return () => undefined;
  }

  async signInWithGoogle(): Promise<void> {
    throw new ServiceError(
      "auth-not-configured",
      "Google sign-in is not configured for this deployment.",
    );
  }

  async signOut(): Promise<void> {
    return undefined;
  }

  async getProfile(): Promise<ProfileReadModel> {
    throw new ServiceError("auth-required", "A signed-in profile is required.");
  }

  async updateProfile(): Promise<ProfileReadModel> {
    throw new ServiceError(
      "auth-not-configured",
      "Profile updates are not configured for this deployment.",
    );
  }
}

export class SupabaseAuthRepository implements AuthRepository {
  isConfigured(): boolean {
    return hasSupabaseConfig();
  }

  async getState(options: RequestOptions = {}): Promise<AuthStateChange> {
    if (options.signal?.aborted) {
      throw new DOMException("The request was aborted.", "AbortError");
    }

    const client = await getSupabaseClient();
    if (!client) {
      return { status: "anonymous" };
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
      throw error;
    }
    const session = data.session;
    if (!session?.user) {
      return { status: "anonymous" };
    }

    let profile: ProfileReadModel;
    try {
      profile = await this.getProfile(options);
    } catch {
      profile = fallbackProfile(session.user);
    }
    return { status: "authenticated", profile };
  }

  subscribe(listener: (state: AuthStateChange) => void): () => void {
    let unsubscribe: () => void = () => undefined;
    void getSupabaseClient().then((client) => {
      if (!client) {
        return;
      }
      const subscription = client.auth.onAuthStateChange((event, session) => {
        if (!session?.user || event === "SIGNED_OUT") {
          listener({ status: "anonymous" });
          return;
        }
        void this.getProfile().then(
          (profile) => listener({ status: "authenticated", profile }),
          () => listener({ status: "authenticated", profile: fallbackProfile(session.user) }),
        );
      }).data.subscription;
      unsubscribe = () => subscription.unsubscribe();
    });
    return () => unsubscribe();
  }

  async signInWithGoogle(returnTo: string): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new ServiceError(
        "auth-not-configured",
        "Google sign-in is not configured for this deployment.",
      );
    }

    const origin = window.location.origin;
    const resolvedReturnTo = new URL(returnTo, origin);
    if (resolvedReturnTo.origin !== origin) {
      throw new ValidationError("The sign-in return path must stay on this site.");
    }

    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?returnTo=${encodeURIComponent(
          `${resolvedReturnTo.pathname}${resolvedReturnTo.search}${resolvedReturnTo.hash}`,
        )}`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (error) {
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) {
      return;
    }
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
  }

  async getProfile(options: RequestOptions = {}): Promise<ProfileReadModel> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new ServiceError("auth-not-configured", "Supabase is not configured.");
    }
    if (options.signal?.aborted) {
      throw new DOMException("The request was aborted.", "AbortError");
    }
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      throw userError ?? new ServiceError("auth-required", "Sign-in is required.");
    }

    const { data, error } = await client.rpc("get_my_profile");
    if (error) {
      throw error;
    }
    return mapProfile(userData.user, data);
  }

  async updateProfile(update: ProfileUpdate): Promise<ProfileReadModel> {
    const fullName = update.fullName.trim();
    const nickname = update.nickname?.trim().toLowerCase() || null;
    if (fullName.length < 2 || fullName.length > 80) {
      throw new ValidationError("Full name must contain 2 to 80 characters.");
    }
    if (nickname && !/^[a-z0-9_]{3,24}$/u.test(nickname)) {
      throw new ValidationError(
        "Nickname must use 3 to 24 lowercase letters, numbers or underscores.",
      );
    }

    const client = await getSupabaseClient();
    if (!client) {
      throw new ServiceError("auth-not-configured", "Supabase is not configured.");
    }
    const { data, error } = await client.rpc("update_my_profile", {
      p_full_name: fullName,
      p_nickname: nickname,
    });
    if (error) {
      throw error;
    }
    const { error: authUpdateError } = await client.auth.updateUser({
      data: { full_name: fullName, name: fullName },
    });
    if (authUpdateError) {
      throw authUpdateError;
    }
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      throw userError ?? new ServiceError("auth-required", "Sign-in is required.");
    }
    return mapProfile(userData.user, data);
  }
}
