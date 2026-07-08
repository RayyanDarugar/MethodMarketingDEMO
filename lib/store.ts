import { create } from "zustand";
import {
  SCENE_ORDER,
  type Profile,
  type SceneId,
  type Vertical,
  activeVertical,
  defaultProfile,
} from "@/lib/content";
import { registerVertical } from "@/lib/verticals";

interface FlowState {
  /** Index into SCENE_ORDER. */
  currentStep: number;
  /** How many times the user has launched the simulation this session. */
  runCount: number;
  /** Session calibration answers from the Setup scene. */
  profile: Profile;
  /**
   * The vertical this session teaches. Defaults to the static built-in;
   * replaced at runtime when a module is generated.
   */
  vertical: Vertical;
  choices: {
    frequencyCap: number;
    priority: string;
  };

  goTo: (scene: SceneId) => void;
  next: () => void;
  setProfile: (questionId: string, values: string[]) => void;
  /** Swap the active vertical (e.g. for a generated module) and reset choices. */
  setVertical: (vertical: Vertical) => void;
  setChoices: (choices: Partial<FlowState["choices"]>) => void;
  /** Store the launch decision and advance to the outcome. */
  launchSimulation: (choices: FlowState["choices"]) => void;
  /** Back to the simulation with previous choices intact. */
  retrySimulation: () => void;
  restart: () => void;
}

const choicesFor = (vertical: Vertical) => ({
  frequencyCap: vertical.simulation.frequencyCap.default,
  priority: vertical.simulation.priority.default,
});

export const useFlowStore = create<FlowState>((set) => ({
  currentStep: 0,
  runCount: 0,
  profile: defaultProfile(activeVertical.config),
  vertical: activeVertical,
  choices: choicesFor(activeVertical),

  goTo: (scene) =>
    set({ currentStep: Math.max(0, SCENE_ORDER.indexOf(scene)) }),

  next: () =>
    set((s) => ({
      currentStep: Math.min(s.currentStep + 1, SCENE_ORDER.length - 1),
    })),

  setProfile: (questionId, values) =>
    set((s) => ({ profile: { ...s.profile, [questionId]: values } })),

  setVertical: (vertical) => {
    registerVertical(vertical);
    set({ vertical, choices: choicesFor(vertical), runCount: 0 });
  },

  setChoices: (choices) =>
    set((s) => ({ choices: { ...s.choices, ...choices } })),

  launchSimulation: (choices) =>
    set((s) => ({
      choices,
      runCount: s.runCount + 1,
      currentStep: SCENE_ORDER.indexOf("outcome"),
    })),

  retrySimulation: () =>
    set({ currentStep: SCENE_ORDER.indexOf("simulation") }),

  restart: () =>
    set((s) => ({
      currentStep: 0,
      runCount: 0,
      choices: choicesFor(s.vertical),
    })),
}));

export function useCurrentScene(): SceneId {
  return SCENE_ORDER[useFlowStore((s) => s.currentStep)];
}

/** The vertical the session is currently teaching. */
export function useVertical(): Vertical {
  return useFlowStore((s) => s.vertical);
}
