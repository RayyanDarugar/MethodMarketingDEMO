import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isRenderableModule,
  type SavedModule,
  type SessionSnapshot,
  type SignInArgs,
  type StorageAdapter,
  type UserProfile,
} from "@/lib/storage";
import type { Vertical } from "@/lib/content";

/**
 * Supabase-backed StorageAdapter. Uses the browser-safe publishable key;
 * demo-grade access control (device-scoped identity via a local user-id
 * pointer, permissive RLS policies on the mm_* tables). Real Supabase Auth
 * slots in behind this same interface later.
 *
 * Every method degrades to the provided fallback adapter on failure, so the
 * app keeps working before the tables exist or when offline.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(URL_ENV && KEY_ENV);
}

const USER_POINTER_KEY = "mm:user-id";

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (!client) client = createClient(URL_ENV!, KEY_ENV!);
  return client;
}

function pointer(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_POINTER_KEY);
}

let warned = false;
function warn(error: unknown) {
  if (!warned) {
    warned = true;
    console.warn(
      "[storage] Supabase unavailable, falling back to this device:",
      error
    );
  }
}

/** Load (or lazily create) the mm_users profile row for an auth user. */
async function profileForAuthUser(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<UserProfile> {
  const db = supabase();
  const { data, error } = await db
    .from("mm_users")
    .select("id, name, email, created_at")
    .eq("id", authUser.id)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    return {
      id: data.id,
      name: data.name,
      email: data.email ?? authUser.email ?? null,
      createdAt: data.created_at,
    };
  }
  const profile: UserProfile = {
    id: authUser.id,
    name:
      (typeof authUser.user_metadata?.name === "string" &&
        authUser.user_metadata.name) ||
      authUser.email?.split("@")[0] ||
      "Learner",
    email: authUser.email ?? null,
    createdAt: new Date().toISOString(),
  };
  const { error: upsertError } = await db.from("mm_users").upsert({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    created_at: profile.createdAt,
  });
  if (upsertError) throw upsertError;
  return profile;
}

export function createSupabaseAdapter(fallback: StorageAdapter): StorageAdapter {
  return {
    async getUser() {
      // Real auth session first (email/password accounts).
      try {
        const { data } = await supabase().auth.getSession();
        if (data.session?.user) {
          const profile = await profileForAuthUser(data.session.user);
          window.localStorage.setItem(USER_POINTER_KEY, profile.id);
          return profile;
        }
      } catch (error) {
        warn(error);
      }
      // Legacy pointer-based accounts (pre-auth demo identities).
      const id = pointer();
      // No cloud pointer — the user may still exist in the fallback store
      // (e.g. sign-in happened while the tables were unreachable).
      if (!id) return fallback.getUser();
      try {
        const { data, error } = await supabase()
          .from("mm_users")
          .select("id, name, email, created_at")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
          id: data.id,
          name: data.name,
          email: data.email ?? null,
          createdAt: data.created_at,
        };
      } catch (error) {
        warn(error);
        return fallback.getUser();
      }
    },

    /**
     * Email/password auth via Supabase Auth. Errors throw with a
     * user-facing message — a wrong password must never silently create a
     * device-local account.
     */
    async signIn({ mode, name, email, password }: SignInArgs) {
      const auth = supabase().auth;
      if (mode === "signup") {
        const { data, error } = await auth.signUp({
          email,
          password,
          options: { data: { name: name?.trim() } },
        });
        if (error) throw new Error(error.message);
        if (!data.session || !data.user) {
          throw new Error(
            'Account created but needs email confirmation. Disable "Confirm email" in Supabase Auth settings for this demo.'
          );
        }
        const profile = await profileForAuthUser(data.user);
        window.localStorage.setItem(USER_POINTER_KEY, profile.id);
        return profile;
      }
      const { data, error } = await auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(
          error.message === "Invalid login credentials"
            ? "No account with that email and password. New here? Create an account."
            : error.message
        );
      }
      const profile = await profileForAuthUser(data.user);
      window.localStorage.setItem(USER_POINTER_KEY, profile.id);
      return profile;
    },

    async saveUser(user: UserProfile) {
      try {
        const { error } = await supabase().from("mm_users").upsert({
          id: user.id,
          name: user.name,
          email: user.email ?? null,
          created_at: user.createdAt,
        });
        if (error) throw error;
        window.localStorage.setItem(USER_POINTER_KEY, user.id);
      } catch (error) {
        warn(error);
        await fallback.saveUser(user);
      }
    },

    async clearUser() {
      // End the auth session; the account and its modules survive for the
      // next sign-in.
      try {
        await supabase().auth.signOut();
      } catch (error) {
        warn(error);
      }
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(USER_POINTER_KEY);
      }
      await fallback.clearUser();
    },

    async getSession() {
      const id = pointer();
      if (!id) return fallback.getSession();
      try {
        const { data, error } = await supabase()
          .from("mm_sessions")
          .select("snapshot")
          .eq("user_id", id)
          .maybeSingle();
        if (error) throw error;
        return (data?.snapshot as SessionSnapshot | undefined) ?? null;
      } catch (error) {
        warn(error);
        return fallback.getSession();
      }
    },

    async saveSession(snapshot: SessionSnapshot) {
      const id = pointer();
      if (!id) return fallback.saveSession(snapshot);
      try {
        const { error } = await supabase().from("mm_sessions").upsert({
          user_id: id,
          snapshot,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      } catch (error) {
        warn(error);
        await fallback.saveSession(snapshot);
      }
    },

    async clearSession() {
      const id = pointer();
      try {
        if (id) {
          await supabase().from("mm_sessions").delete().eq("user_id", id);
        }
      } catch (error) {
        warn(error);
      }
      await fallback.clearSession();
    },

    async listModules() {
      const id = pointer();
      if (!id) return fallback.listModules();
      try {
        const { data, error } = await supabase()
          .from("mm_modules")
          .select(
            "id, industry, role, product_name, source, core_id, vertical, created_at"
          )
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (error) throw error;
        return (data ?? [])
          .map((row) => ({
            id: row.id,
            industry: row.industry,
            role: row.role,
            productName: row.product_name,
            source: row.source as SavedModule["source"],
            coreId: row.core_id ?? null,
            createdAt: row.created_at,
            vertical: row.vertical as Vertical,
          }))
          .filter(isRenderableModule);
      } catch (error) {
        warn(error);
        return fallback.listModules();
      }
    },

    async saveModule(module: SavedModule) {
      const id = pointer();
      if (!id) return fallback.saveModule(module);
      try {
        const { error } = await supabase().from("mm_modules").upsert({
          id: module.id,
          user_id: id,
          industry: module.industry,
          role: module.role,
          product_name: module.productName,
          source: module.source,
          core_id: module.coreId ?? null,
          vertical: module.vertical,
          created_at: module.createdAt,
        });
        if (error) throw error;
      } catch (error) {
        warn(error);
        await fallback.saveModule(module);
      }
    },

    async deleteModule(id: string) {
      try {
        const { error } = await supabase().from("mm_modules").delete().eq("id", id);
        if (error) throw error;
      } catch (error) {
        warn(error);
        await fallback.deleteModule(id);
      }
    },
  };
}
