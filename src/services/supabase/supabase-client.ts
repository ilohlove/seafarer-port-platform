import type { SupabaseClient } from "@supabase/supabase-js";

let clientPromise: Promise<SupabaseClient | undefined> | undefined;

export function hasSupabaseConfig(): boolean {
  if (import.meta.env.MODE === "test") {
    return false;
  }

  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSupabaseClient(): Promise<SupabaseClient | undefined> {
  if (!hasSupabaseConfig()) {
    return Promise.resolve(undefined);
  }

  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    ),
  );

  return clientPromise;
}
