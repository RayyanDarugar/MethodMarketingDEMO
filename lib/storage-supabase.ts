import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  SavedModule,
  SessionSnapshot,
  StorageAdapter,
  UserProfile,
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

export function createSupabaseAdapter(fallback: StorageAdapter): StorageAdapter {
  return {
    async getUser() {
      const id = pointer();
      // No cloud pointer — the user may still exist in the fallback store
      // (e.g. sign-in happened while the tables were unreachable).
      if (!id) return fallback.getUser();
      try {
        const { data, error } = await supabase()
          .from("mm_users")
          .select("id, name, created_at")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return { id: data.id, name: data.name, createdAt: data.created_at };
      } catch (error) {
        warn(error);
        return fallback.getUser();
      }
    },

    async saveUser(user: UserProfile) {
      try {
        const { error } = await supabase().from("mm_users").upsert({
          id: user.id,
          name: user.name,
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
      // Signing out detaches the device from the account; the cloud row
      // (and its saved modules) survive for a future real-auth reclaim.
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
        return (data ?? []).map((row) => ({
          id: row.id,
          industry: row.industry,
          role: row.role,
          productName: row.product_name,
          source: row.source as SavedModule["source"],
          coreId: row.core_id ?? null,
          createdAt: row.created_at,
          vertical: row.vertical as Vertical,
        }));
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
