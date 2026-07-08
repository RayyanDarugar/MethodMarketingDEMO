import { z } from "zod";
import type {
  ConfigContent,
  DecisionLogic,
  Projection,
  Vertical,
} from "@/lib/content";

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

const Tone = z.enum(["good", "warn"]);

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
  simulation: z.object({
    productName: z.string(),
    environmentLabel: z.string(),
    nav: z
      .array(
        z.object({
          section: z.string(),
          items: z
            .array(
              z.object({
                label: z.string(),
                active: z.boolean(),
                badge: z.string().nullable(),
              })
            )
            .min(1)
            .max(4),
        })
      )
      .min(2)
      .max(4),
    breadcrumb: z.array(z.string()).min(2).max(4),
    taskTitle: z.string(),
    taskBrief: z.string(),
    campaign: z.object({
      lineItemName: z.string(),
      advertiser: z.string(),
      budget: z.number(),
      currency: z.string(),
      impressionsGoal: z.number(),
      cpm: z.number(),
      flight: z.string(),
    }),
    frequencyCap: z.object({
      label: z.string(),
      unit: z.string(),
      helper: z.string(),
      min: z.number().int(),
      max: z.number().int(),
      default: z.number().int(),
    }),
    priority: z.object({
      label: z.string(),
      helper: z.string(),
      options: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
            description: z.string(),
          })
        )
        .min(2)
        .max(4),
      default: z.string(),
    }),
    forecast: z.object({
      label: z.string(),
      disclaimer: z.string(),
      /** One entry per integer cap value, min..max inclusive. */
      byCap: z.array(
        z.object({
          cap: z.number().int(),
          reachPct: z.number(),
          deliveryPct: z.number(),
          avgFrequency: z.number(),
        })
      ),
    }),
    launchLabel: z.string(),
  }),
  decision: z.object({
    bands: z
      .array(z.object({ max: z.number().int(), outcome: z.enum(["low", "balanced"]) }))
      .min(1)
      .max(3),
    thresholds: z.object({
      reachGoodAt: z.number(),
      frequencyWasteAt: z.number(),
    }),
    priorityNotes: z.array(
      z.object({ priority: z.string(), tone: Tone, text: z.string() })
    ),
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
  payoff: z.object({
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
  }),
});

export type GeneratedVertical = z.infer<typeof GeneratedVerticalSchema>;

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
  const byCap: Record<number, Projection> = {};
  for (const row of generated.simulation.forecast.byCap) {
    byCap[row.cap] = {
      reachPct: row.reachPct,
      deliveryPct: row.deliveryPct,
      avgFrequency: row.avgFrequency,
    };
  }

  const priorityNotes: DecisionLogic["priorityNotes"] = {};
  for (const note of generated.decision.priorityNotes) {
    priorityNotes[note.priority] = { tone: note.tone, text: note.text };
  }

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
    simulation: {
      ...generated.simulation,
      nav: generated.simulation.nav.map((section) => ({
        section: section.section,
        items: section.items.map((item) => ({
          label: item.label,
          ...(item.active ? { active: true } : {}),
          ...(item.badge ? { badge: item.badge } : {}),
        })),
      })),
      forecast: {
        label: generated.simulation.forecast.label,
        disclaimer: generated.simulation.forecast.disclaimer,
        byCap,
      },
    },
    decision: {
      input: "frequencyCap",
      bands: generated.decision.bands,
      fallback: "high",
      thresholds: generated.decision.thresholds,
      priorityNotes,
    },
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
  const cap = simulation.frequencyCap;

  if (!(cap.min < cap.max)) {
    errors.push(`frequencyCap.min (${cap.min}) must be < max (${cap.max}).`);
  }
  if (cap.default < cap.min || cap.default > cap.max) {
    errors.push(`frequencyCap.default must be within [min, max].`);
  }

  for (let value = cap.min; value <= cap.max; value++) {
    if (!simulation.forecast.byCap[value]) {
      errors.push(`forecast.byCap is missing an entry for cap=${value}.`);
    }
  }

  const bandMaxes = decision.bands.map((b) => b.max);
  if ([...bandMaxes].sort((a, b) => a - b).join() !== bandMaxes.join()) {
    errors.push("decision.bands must be sorted by ascending max.");
  }
  if (bandMaxes.some((m) => m < cap.min || m >= cap.max)) {
    errors.push(
      "every decision band max must lie within [cap.min, cap.max) so the 'high' fallback is reachable."
    );
  }
  if (!decision.bands.some((b) => b.outcome === "balanced")) {
    errors.push("decision.bands must include a 'balanced' band (the win state).");
  }

  const priorityValues = new Set(simulation.priority.options.map((o) => o.value));
  if (!priorityValues.has(simulation.priority.default)) {
    errors.push("priority.default must be one of priority.options[].value.");
  }
  for (const value of priorityValues) {
    if (!decision.priorityNotes[value]) {
      errors.push(`decision.priorityNotes is missing an entry for priority "${value}".`);
    }
  }

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
