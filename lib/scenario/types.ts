/**
 * Tier B simulation contract: a beat-based "day in the seat" scenario.
 * Spec: docs/superpowers/specs/2026-07-10-scenario-engine-design.md
 *
 * Everything is plain generated JSON — deterministic, validatable,
 * cacheable, zero play-time model cost. `lib/scenario/engine.ts` owns the
 * math; the zod wire schema in lib/generation/schema.ts mirrors these
 * shapes (kept aligned by the tiling tests).
 */

export type Archetype = "opsDashboard" | "dealDesk" | "studioBoard";

export type BeatChannel = "email" | "chat" | "call" | "ticket";

export interface Meter {
  id: string;
  label: string;
  /** Display unit, e.g. "%", "months", "pts". */
  unit: string;
  start: number;
  min: number;
  max: number;
  /** Which direction is healthy, for meter coloring. */
  goodDirection: "up" | "down";
  /** Exactly one meter is decisive: its final value picks the ending. */
  decisive?: boolean;
}

export interface Effect {
  /** Meter id. */
  meter: string;
  delta: number;
}

export interface BeatChoice {
  label: string;
  effects: Effect[];
  /** One-line narrative shown after choosing. */
  consequence: string;
}

export interface MessageBeat {
  kind: "message";
  id: string;
  channel: BeatChannel;
  from: { name: string; role: string };
  subject?: string;
  /** The inbound event the learner must handle. */
  body: string;
  /** 2–4 responses. */
  choices: BeatChoice[];
}

export interface NumericBeat {
  kind: "numeric";
  id: string;
  /** The situation forcing the numeric call. */
  prompt: string;
  control: {
    label: string;
    unit: string;
    min: number;
    max: number;
    default: number;
  };
  /** One row per integer control value, min..max inclusive. */
  byValue: Array<{ value: number; effects: Effect[]; note: string }>;
}

export type Beat = MessageBeat | NumericBeat;

export interface ScenarioSimulation {
  archetype: Archetype;
  /** Fictional tool name (never a real vendor). */
  productName: string;
  environmentLabel: string;
  /** 3–6 locked contract facts shown in the shell's header. */
  header: Array<{ label: string; value: string; sublabel?: string }>;
  /** Exactly 3. */
  meters: Meter[];
  /** 5–7 beats, exactly one NumericBeat. */
  beats: Beat[];
  launchLabel: string;
}

export interface DecisionBand {
  /** Ending applies while decisive meter final value <= max. */
  max: number;
  outcome: "low" | "balanced";
}

/** The learner's answer to one beat. */
export interface BeatSelection {
  beatId: string;
  /** Index into choices (message beats). */
  choiceIndex?: number;
  /** Chosen control value (numeric beats). */
  value?: number;
}
