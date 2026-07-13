import { z } from "zod";
import type { ConfigContent, Vertical } from "@/lib/content";
import { validateScenario } from "@/lib/scenario/engine";

/**
 * Generation wire format + validation.
 *
 * The wire schema mirrors the app's Vertical type with one deliberate
 * difference: record-shaped fields (forecast byCap, priorityNotes) are
 * emitted as arrays, because structured-output JSON schemas require
 * `additionalProperties: false` on every object. `toVertical()` converts a
 * validated wire object into the app's Vertical shape.
 */

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const GenerationRequestSchema = z.object({
  product: z.object({
    name: z.string().min(1).max(80),
    description: z.string().min(1).max(500),
  }),
  targetIndustry: z.string().min(1).max(80),
  targetRole: z.string().min(1).max(80),
  /** Calibration answers from the Setup scene, keyed by question id. */
  profile: z.record(z.string(), z.array(z.string())),
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

// ---------------------------------------------------------------------------
// Wire schema (what the model emits)
// ---------------------------------------------------------------------------


const FollowUp = z.object({
  question: z.string(),
  answer: z.string(),
});

const cardBase = {
  id: z.string(),
  eyebrow: z.string(),
  title: z.string(),
  lede: z.string(),
  followUps: z.array(FollowUp).min(2).max(4),
  fallbackAnswer: z.string(),
};

const LessonCardSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("flow"),
    ...cardBase,
    stages: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          tagline: z.string(),
          detail: z.string(),
          worry: z.string(),
        })
      )
      .min(3)
      .max(5),
  }),
  z.object({
    kind: z.literal("terms"),
    ...cardBase,
    terms: z
      .array(
        z.object({
          term: z.string(),
          definition: z.string(),
          whyItMatters: z.string(),
          heardAs: z.string(),
        })
      )
      .min(4)
      .max(6),
  }),
  z.object({
    kind: z.literal("pressures"),
    ...cardBase,
    pressures: z
      .array(
        z.object({
          title: z.string(),
          body: z.string(),
          consequence: z.string(),
        })
      )
      .min(3)
      .max(5),
  }),
  z.object({
    kind: z.literal("timeline"),
    ...cardBase,
    entries: z
      .array(
        z.object({
          time: z.string(),
          label: z.string(),
          detail: z.string(),
        })
      )
      .min(4)
      .max(6),
  }),
]);

const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z
    .array(
      z.object({
        label: z.string(),
        correct: z.boolean(),
        feedback: z.string(),
      })
    )
    .min(2)
    .max(4),
});

const EmailCardSchema = z.object({
  label: z.string(),
  sublabel: z.string(),
  subject: z.string(),
  body: z.array(z.string()).min(1).max(4),
});

const ArtifactSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("emailSequence"),
    id: z.string(),
    label: z.string(),
    description: z.string(),
    emails: z
      .array(
        z.object({
          day: z.string(),
          purpose: z.string(),
          subject: z.string(),
          body: z.array(z.string()).min(1).max(4),
        })
      )
      .min(2)
      .max(4),
  }),
  z.object({
    kind: z.literal("callScript"),
    id: z.string(),
    label: z.string(),
    description: z.string(),
    scenario: z.string(),
    sections: z
      .array(
        z.object({
          heading: z.string(),
          lines: z
            .array(
              z.object({
                speaker: z.enum(["you", "note"]),
                text: z.string(),
              })
            )
            .min(1)
            .max(4),
        })
      )
      .min(3)
      .max(6),
  }),
  z.object({
    kind: z.literal("landingPage"),
    id: z.string(),
    label: z.string(),
    description: z.string(),
    hero: z.object({
      eyebrow: z.string(),
      headline: z.string(),
      subhead: z.string(),
      cta: z.string(),
    }),
    valueProps: z
      .array(z.object({ title: z.string(), body: z.string() }))
      .min(3)
      .max(3),
  }),
  z.object({
    kind: z.literal("ideas"),
    id: z.string(),
    label: z.string(),
    description: z.string(),
    ideas: z
      .array(z.object({ title: z.string(), angle: z.string() }))
      .min(4)
      .max(6),
  }),
]);

export const GeneratedPayoffSchema = z.object({
  headline: z.string(),
  subhead: z.string(),
  before: EmailCardSchema,
  after: EmailCardSchema,
  toolkit: z.object({
    title: z.string(),
    subhead: z.string(),
    artifacts: z.array(ArtifactSchema).min(3).max(4),
  }),
  exporting: z.object({
    title: z.string(),
    body: z.string(),
    copyLabel: z.string(),
    downloadLabel: z.string(),
  }),
  completion: z.object({ title: z.string(), body: z.string() }),
  restartLabel: z.string(),
});

export type GeneratedPayoff = z.infer<typeof GeneratedPayoffSchema>;

// ---------------------------------------------------------------------------
// Scenario simulation wire schema — mirrors lib/scenario/types.ts (the app
// shape and wire shape are identical in v2; the tiling tests keep them
// aligned). Structural determinism rules live in lib/scenario/engine.ts.
// ---------------------------------------------------------------------------

const EffectSchema = z.object({
  meter: z.string(),
  delta: z.number(),
});

const MeterSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string(),
  start: z.number(),
  min: z.number(),
  max: z.number(),
  goodDirection: z.enum(["up", "down"]),
  decisive: z.boolean().optional(),
});

const MessageBeatSchema = z.object({
  kind: z.literal("message"),
  id: z.string(),
  channel: z.enum(["email", "chat", "call", "ticket"]),
  from: z.object({ name: z.string(), role: z.string() }),
  subject: z.string().optional(),
  body: z.string(),
  choices: z
    .array(
      z.object({
        label: z.string(),
        effects: z.array(EffectSchema),
        consequence: z.string(),
      })
    )
    .min(2)
    .max(4),
});

const NumericBeatSchema = z.object({
  kind: z.literal("numeric"),
  id: z.string(),
  prompt: z.string(),
  control: z.object({
    label: z.string(),
    unit: z.string(),
    min: z.number().int(),
    max: z.number().int(),
    default: z.number().int(),
  }),
  byValue: z.array(
    z.object({
      value: z.number().int(),
      effects: z.array(EffectSchema),
      note: z.string(),
    })
  ),
});

const ScenarioSimulationSchema = z.object({
  archetype: z.enum(["opsDashboard", "dealDesk", "studioBoard"]),
  productName: z.string(),
  environmentLabel: z.string(),
  header: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        sublabel: z.string().optional(),
      })
    )
    .min(3)
    .max(6),
  meters: z.array(MeterSchema).min(3).max(3),
  beats: z
    .array(z.discriminatedUnion("kind", [MessageBeatSchema, NumericBeatSchema]))
    .min(5)
    .max(7),
  launchLabel: z.string(),
});

const OutcomeResultSchema = z.object({
  status: z.enum(["win", "risk"]),
  verdict: z.string(),
  summary: z.string(),
  risk: z
    .object({ title: z.string(), body: z.string() })
    .nullable(),
  coaching: z.string(),
});

export const GeneratedVerticalSchema = z.object({
  industry: z.string(),
  role: z.string(),
  intro: z.object({
    eyebrow: z.string(),
    headline: z.string(),
    subhead: z.string(),
    cta: z.string(),
  }),
  lesson: z.object({
    title: z.string(),
    subhead: z.string(),
    cards: z.array(LessonCardSchema).min(3).max(5),
    cta: z.string(),
  }),
  briefing: z.object({
    eyebrow: z.string(),
    title: z.string(),
    mission: z.array(z.string()).min(1).max(3),
    decisions: z
      .array(z.object({ label: z.string(), summary: z.string() }))
      .min(2)
      .max(2),
    objectives: z
      .array(z.object({ label: z.string(), detail: z.string() }))
      .min(2)
      .max(4),
    quizTitle: z.string(),
    quiz: z.array(QuizQuestionSchema).min(1).max(3),
    cta: z.string(),
  }),
  simulation: ScenarioSimulationSchema,
  decision: z.object({
    bands: z
      .array(z.object({ max: z.number().int(), outcome: z.enum(["low", "balanced"]) }))
      .min(1)
      .max(3),
  }),
  outcomes: z.object({
    low: OutcomeResultSchema,
    balanced: OutcomeResultSchema,
    high: OutcomeResultSchema,
  }),
  assistant: z.object({
    buttonLabel: z.string(),
    lines: z.array(z.string()).min(1).max(3),
  }),
  payoff: GeneratedPayoffSchema,
});

export type GeneratedVertical = z.infer<typeof GeneratedVerticalSchema>;

// ---------------------------------------------------------------------------
// Section schemas — chunked generation. Sections tile GeneratedVerticalSchema
// exactly (foundation + simulation + payoff); each is generated in its own
// short API call so a full seed never exceeds serverless time limits.
// ---------------------------------------------------------------------------

export const GeneratedFoundationSchema = GeneratedVerticalSchema.pick({
  industry: true,
  role: true,
  intro: true,
  lesson: true,
  briefing: true,
});

export const GeneratedSimulationSchema = GeneratedVerticalSchema.pick({
  simulation: true,
  decision: true,
  outcomes: true,
  assistant: true,
});

export type GeneratedFoundation = z.infer<typeof GeneratedFoundationSchema>;
export type GeneratedSimulation = z.infer<typeof GeneratedSimulationSchema>;

/**
 * Section-local semantic rules, run at section-generation time so a bad
 * section retries alone instead of surfacing at final assembly. These mirror
 * the corresponding checks in validateVertical (which remains the assembled
 * safety net); the wire shapes differ (byCap array vs record), hence
 * separate functions.
 */
export function validateFoundationWire(f: GeneratedFoundation): string[] {
  const errors: string[] = [];

  if (!f.lesson.cards.some((c) => c.kind === "terms")) {
    errors.push("lesson.cards must include a 'terms' card.");
  }

  for (const q of f.briefing.quiz) {
    const correct = q.options.filter((o) => o.correct).length;
    if (correct !== 1) {
      errors.push(
        `quiz question "${q.id}" must have exactly one correct option (has ${correct}).`
      );
    }
  }

  return errors;
}

export function validateSimulationWire(s: GeneratedSimulation): string[] {
  // Structural + reachability rules live in the scenario engine — the same
  // math the app uses at play time validates the wire at generation time.
  return validateScenario(s.simulation, s.decision.bands);
}

// ---------------------------------------------------------------------------
// Wire → app conversion
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Converts a validated wire object into the app's Vertical shape. The Setup
 * scene's calibration config is app-owned, not generated — it's injected
 * from the base vertical.
 */
export function toVertical(
  generated: GeneratedVertical,
  config: ConfigContent
): Vertical {
  const outcomes = Object.fromEntries(
    (["low", "balanced", "high"] as const).map((key) => {
      const { risk, ...rest } = generated.outcomes[key];
      return [key, { key, ...rest, ...(risk ? { risk } : {}) }];
    })
  ) as Vertical["outcomes"];

  return {
    id: `generated-${slugify(`${generated.industry}-${generated.role}`)}-${Date.now().toString(36)}`,
    industry: generated.industry,
    role: generated.role,
    intro: generated.intro,
    config,
    lesson: {
      ...generated.lesson,
      cards: generated.lesson.cards,
    },
    briefing: generated.briefing,
    simulation: generated.simulation,
    decision: { bands: generated.decision.bands },
    outcomes,
    assistant: generated.assistant,
    payoff: generated.payoff,
  };
}

// ---------------------------------------------------------------------------
// Semantic validation (beyond what the schema can express)
// ---------------------------------------------------------------------------

/** Collect [[term]] markers from a string. */
function markers(text: string): string[] {
  return [...text.matchAll(/\[\[(.*?)\]\]/g)].map((m) => m[1].toLowerCase());
}

/**
 * Returns hard errors (fed back to the model for a retry) and soft warnings
 * (returned to the client but not blocking).
 */
export function validateVertical(vertical: Vertical): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { simulation, decision, briefing, lesson } = vertical;

  errors.push(...validateScenario(simulation, decision.bands));

  for (const q of briefing.quiz) {
    const correct = q.options.filter((o) => o.correct).length;
    if (correct !== 1) {
      errors.push(`quiz question "${q.id}" must have exactly one correct option (has ${correct}).`);
    }
  }

  // [[term]] markers should reference glossary terms — soft check.
  const termsCard = lesson.cards.find((c) => c.kind === "terms");
  if (!termsCard) {
    errors.push("lesson.cards must include a 'terms' card.");
  } else {
    const glossary = new Set(
      termsCard.terms.map((t) => t.term.toLowerCase())
    );
    const texts: string[] = [
      ...vertical.payoff.after.body,
      ...vertical.payoff.toolkit.artifacts.flatMap((a) => JSON.stringify(a)),
    ];
    const unknown = new Set(
      texts.flatMap(markers).filter((m) => !glossary.has(m))
    );
    if (unknown.size > 0) {
      warnings.push(
        `[[term]] markers not found in the glossary (rendered anyway): ${[...unknown].join(", ")}`
      );
    }
  }

  return { errors, warnings };
}
