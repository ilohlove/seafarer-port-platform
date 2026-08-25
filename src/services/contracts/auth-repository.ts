import type { ProfileReadModel } from "../../types";
import type { RequestOptions } from "./request-context";

export interface AuthStateChange {
  readonly status: "anonymous" | "authenticated";
  readonly profile?: ProfileReadModel;
}

export interface ProfileUpdate {
  readonly fullName: string;
  readonly nickname?: string;
}

export interface AuthRepository {
  isConfigured(): boolean;
  getState(options?: RequestOptions): Promise<AuthStateChange>;
  subscribe(listener: (state: AuthStateChange) => void): () => void;
  signInWithGoogle(returnTo: string): Promise<void>;
  signOut(): Promise<void>;
  getProfile(options?: RequestOptions): Promise<ProfileReadModel>;
  updateProfile(update: ProfileUpdate): Promise<ProfileReadModel>;
}
