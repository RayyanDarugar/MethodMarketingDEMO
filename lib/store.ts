import { create } from "zustand";
import {
  SCENE_ORDER,
  type Profile,
  type SceneId,
  type Vertical,
  activeVertical,
  defaultProfile,
} from "@/lib/content";
import { storage, type SignInArgs, type UserProfile } from "@/lib/storage";
import type { BeatSelection } from "@/lib/scenario/types";
import { getVertical, registerVertical } from "@/lib/verticals";

interface FlowState {
  /** True once persisted user/session state has been loaded. */
  hydrated: boolean;
  /** Signed-in user; null shows the Welcome screen. */
  user: UserProfile | null;
  /** Index into SCENE_ORDER. */
  currentStep: number;
  /** How many times the user has launched the simulation this session. */
  runCount: number;
  /** Session calibration answers from the Setup scene. */
  profile: Profile;
  /**
   * The vertical this session teaches. Defaults to the static built-in;
   * replaced at runtime when a module is generated or reopened.
   */
  vertical: Vertical;
  /**
   * Cache core the active vertical was assembled from (null for the
   * built-in and mock verticals). Attributes feedback to the shared core.
   */
  coreId: string | null;
  /** The learner's beat-by-beat answers from the scenario run. */
  selections: BeatSelection[];

  /** Module-library dashboard overlay (shown after sign-in / on return). */
  showDashboard: boolean;
  openDashboard: () => void;
  closeDashboard: () => void;

  hydrate: () => Promise<void>;
  /** Throws with a user-facing message on auth failure. */
  signIn: (args: SignInArgs) => Promise<void>;
  signOut: () => Promise<void>;
  goTo: (scene: SceneId) => void;
  next: () => void;
  setProfile: (questionId: string, values: string[]) => void;
  /** Swap the active vertical (e.g. for a generated module) and reset the run. */
  setVertical: (vertical: Vertical, meta?: { coreId?: string | null }) => void;
  /** Store the scenario run and advance to the outcome. */
  launchSimulation: (selections: BeatSelection[]) => void;
  /** Back to the simulation with previous choices intact. */
  retrySimulation: () => void;
  restart: () => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  hydrated: false,
  user: null,
  currentStep: 0,
  runCount: 0,
  profile: defaultProfile(activeVertical.config),
  vertical: activeVertical,
  coreId: null,
  selections: [],

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const [user, session, modules] = await Promise.all([
        storage.getUser(),
        storage.getSession(),
        storage.listModules(),
      ]);
      // Saved modules must be resolvable before the session can resume one.
      for (const m of modules) registerVertical(m.vertical);

      if (user && session) {
        const vertical = getVertical(session.verticalId) ?? activeVertical;
        set({
          user,
          profile: { ...defaultProfile(activeVertical.config), ...session.profile },
          vertical,
          coreId:
            modules.find((m) => m.id === session.verticalId)?.coreId ?? null,
          currentStep: Math.min(
            Math.max(session.step, 0),
            SCENE_ORDER.length - 1
          ),
          selections: [],
          showDashboard: true,
        });
      } else if (user) {
        set({ user, showDashboard: true });
      }
    } finally {
      set({ hydrated: true });
      // Persist the session on every subsequent change, best-effort.
      useFlowStore.subscribe((s) => {
        if (!s.user) return;
        void storage.saveSession({
          step: s.currentStep,
          verticalId: s.vertical.id,
          profile: s.profile,
        });
      });
    }
  },

  showDashboard: false,
  openDashboard: () => set({ showDashboard: true }),
  closeDashboard: () => set({ showDashboard: false }),

  signIn: async (args) => {
    const user: UserProfile = await storage.signIn(args);
    set({ user, showDashboard: true });
  },

  signOut: async () => {
    await Promise.all([storage.clearUser(), storage.clearSession()]);
    set({
      user: null,
      showDashboard: false,
      currentStep: 0,
      runCount: 0,
      profile: defaultProfile(activeVertical.config),
      vertical: activeVertical,
      coreId: null,
      selections: [],
    });
  },

  goTo: (scene) =>
    set({ currentStep: Math.max(0, SCENE_ORDER.indexOf(scene)) }),

  next: () =>
    set((s) => ({
      currentStep: Math.min(s.currentStep + 1, SCENE_ORDER.length - 1),
    })),

  setProfile: (questionId, values) =>
    set((s) => ({ profile: { ...s.profile, [questionId]: values } })),

  setVertical: (vertical, meta) => {
    registerVertical(vertical);
    set({
      vertical,
      coreId: meta?.coreId ?? null,
      selections: [],
      runCount: 0,
    });
  },

  launchSimulation: (selections) =>
    set((s) => ({
      selections,
      runCount: s.runCount + 1,
      currentStep: SCENE_ORDER.indexOf("outcome"),
    })),

  retrySimulation: () =>
    set({ currentStep: SCENE_ORDER.indexOf("simulation") }),

  restart: () =>
    set({
      currentStep: 0,
      runCount: 0,
      selections: [],
    }),
}));

export function useCurrentScene(): SceneId {
  return SCENE_ORDER[useFlowStore((s) => s.currentStep)];
}

/** The vertical the session is currently teaching. */
export function useVertical(): Vertical {
  return useFlowStore((s) => s.vertical);
}
