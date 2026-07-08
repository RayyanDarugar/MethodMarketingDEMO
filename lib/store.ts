import { create } from "zustand";
import {
  SCENE_ORDER,
  type Profile,
  type SceneId,
  activeVertical,
  defaultProfile,
} from "@/lib/content";

interface FlowState {
  /** Index into SCENE_ORDER. */
  currentStep: number;
  /** How many times the user has launched the simulation this session. */
  runCount: number;
  /** Session calibration answers from the Setup scene. */
  profile: Profile;
  choices: {
    frequencyCap: number;
    priority: string;
  };

  goTo: (scene: SceneId) => void;
  next: () => void;
  setProfile: (questionId: string, values: string[]) => void;
  setChoices: (choices: Partial<FlowState["choices"]>) => void;
  /** Store the launch decision and advance to the outcome. */
  launchSimulation: (choices: FlowState["choices"]) => void;
  /** Back to the simulation with previous choices intact. */
  retrySimulation: () => void;
  restart: () => void;
}

const initialChoices = () => ({
  frequencyCap: activeVertical.simulation.frequencyCap.default,
  priority: activeVertical.simulation.priority.default,
});

export const useFlowStore = create<FlowState>((set) => ({
  currentStep: 0,
  runCount: 0,
  profile: defaultProfile(activeVertical.config),
  choices: initialChoices(),

  goTo: (scene) =>
    set({ currentStep: Math.max(0, SCENE_ORDER.indexOf(scene)) }),

  next: () =>
    set((s) => ({
      currentStep: Math.min(s.currentStep + 1, SCENE_ORDER.length - 1),
    })),

  setProfile: (questionId, values) =>
    set((s) => ({ profile: { ...s.profile, [questionId]: values } })),

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
    set({ currentStep: 0, runCount: 0, choices: initialChoices() }),
}));

export function useCurrentScene(): SceneId {
  return SCENE_ORDER[useFlowStore((s) => s.currentStep)];
}
