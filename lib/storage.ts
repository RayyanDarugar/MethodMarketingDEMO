import type { Profile, Vertical } from "@/lib/content";

/**
 * Persistence seam. Everything the app stores goes through StorageAdapter,
 * so swapping localStorage for a real backend (Supabase: a `profiles` table,
 * a `modules` table, auth for the user record) is one adapter swap — the
 * store and components don't change. The interface is async for exactly
 * that reason, even though the local implementation doesn't need it.
 */

export interface UserProfile {
  id: string;
  name: string;
  email?: string | null;
  createdAt: string;
}

export interface SignInArgs {
  mode: "signin" | "signup";
  /** Required for signup; ignored on signin (profile name wins). */
  name?: string;
  email: string;
  password: string;
}

export interface SavedModule {
  /** Matches vertical.id. */
  id: string;
  industry: string;
  role: string;
  productName: string;
  source: "model" | "mock" | "cached";
  /** Cache core this module was assembled from, for feedback attribution. */
  coreId?: string | null;
  createdAt: string;
  vertical: Vertical;
}

/**
 * Saved modules from before the Tier B scenario engine carry a v1
 * simulation shape the app can no longer render — drop them on read
 * (intentionally unmigrated; regenerating is cheap via the core cache).
 */
export function isRenderableModule(module: SavedModule): boolean {
  const sim = module.vertical?.simulation as { archetype?: unknown } | undefined;
  return typeof sim?.archetype === "string";
}

/** Where the user is in the flow, for resume-on-reload. */
export interface SessionSnapshot {
  step: number;
  verticalId: string;
  profile: Profile;
}

export interface StorageAdapter {
  getUser(): Promise<UserProfile | null>;
  /**
   * Authenticate (or register) and return the account's profile. Throws
   * with a user-facing message on failure — sign-in errors must surface,
   * never silently fall back.
   */
  signIn(args: SignInArgs): Promise<UserProfile>;
  saveUser(user: UserProfile): Promise<void>;
  clearUser(): Promise<void>;

  getSession(): Promise<SessionSnapshot | null>;
  saveSession(snapshot: SessionSnapshot): Promise<void>;
  clearSession(): Promise<void>;

  listModules(): Promise<SavedModule[]>;
  saveModule(module: SavedModule): Promise<void>;
  deleteModule(id: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// localStorage implementation (device-scoped "account")
// ---------------------------------------------------------------------------

const KEYS = {
  user: "mm:user",
  session: "mm:session",
  modules: "mm:modules",
} as const;

/** Newest-first cap so a chatty demo can't fill localStorage. */
const MAX_SAVED_MODULES = 10;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or privacy mode — persistence is best-effort in the demo.
  }
}

function remove(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

const localStorageAdapter: StorageAdapter = {
  async getUser() {
    return read<UserProfile>(KEYS.user);
  },
  /**
   * Device-local "account": no real auth, so the password is ignored. An
   * existing profile with the same email is reclaimed; otherwise a new one
   * is created (signin mode included — keyless dev shouldn't dead-end).
   */
  async signIn({ name, email }) {
    const existing = read<UserProfile>(KEYS.user);
    if (existing?.email?.toLowerCase() === email.toLowerCase()) {
      return existing;
    }
    const user: UserProfile = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`,
      name: name?.trim() || email.split("@")[0],
      email,
      createdAt: new Date().toISOString(),
    };
    write(KEYS.user, user);
    return user;
  },
  async saveUser(user) {
    write(KEYS.user, user);
  },
  async clearUser() {
    remove(KEYS.user);
  },

  async getSession() {
    return read<SessionSnapshot>(KEYS.session);
  },
  async saveSession(snapshot) {
    write(KEYS.session, snapshot);
  },
  async clearSession() {
    remove(KEYS.session);
  },

  async listModules() {
    return (read<SavedModule[]>(KEYS.modules) ?? []).filter(isRenderableModule);
  },
  async saveModule(module) {
    const modules = (read<SavedModule[]>(KEYS.modules) ?? []).filter(
      (m) => m.id !== module.id
    );
    write(KEYS.modules, [module, ...modules].slice(0, MAX_SAVED_MODULES));
  },
  async deleteModule(id) {
    const modules = read<SavedModule[]>(KEYS.modules) ?? [];
    write(
      KEYS.modules,
      modules.filter((m) => m.id !== id)
    );
  },
};

import {
  createSupabaseAdapter,
  isSupabaseConfigured,
} from "@/lib/storage-supabase";

/**
 * The adapter the app currently uses: Supabase when the public env keys are
 * configured (with localStorage as its per-call fallback), plain
 * localStorage otherwise.
 */
export const storage: StorageAdapter = isSupabaseConfigured()
  ? createSupabaseAdapter(localStorageAdapter)
  : localStorageAdapter;
