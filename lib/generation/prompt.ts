import {
  activeVertical,
  profileLabels,
  type Vertical,
} from "@/lib/content";
import type { GeneratedVertical, GenerationRequest } from "./schema";

/**
 * Prompt assembly for on-demand module generation.
 *
 * The gold exemplar is derived from the expert-authored static vertical at
 * runtime, so prompt and product content never drift apart. The expertNotes
 * parameter is the seam for the expert-knowledge database: retrieved,
 * validated facts about the target role get injected there, turning
 * generation from invention into composition.
 */

/** Convert an app Vertical into the wire shape the model is asked to emit. */
export function toWireFormat(vertical: Vertical): GeneratedVertical {
  return {
    industry: vertical.industry,
    role: vertical.role,
    intro: vertical.intro,
    lesson: vertical.lesson,
    briefing: vertical.briefing,
    simulation: {
      ...vertical.simulation,
      nav: vertical.simulation.nav.map((section) => ({
        section: section.section,
        items: section.items.map((item) => ({
          label: item.label,
          active: item.active ?? false,
          badge: item.badge ?? null,
        })),
      })),
      forecast: {
        label: vertical.simulation.forecast.label,
        disclaimer: vertical.simulation.forecast.disclaimer,
        byCap: Object.entries(vertical.simulation.forecast.byCap).map(
          ([cap, p]) => ({ cap: Number(cap), ...p })
        ),
      },
    },
    decision: {
      bands: vertical.decision.bands.map((b) => ({
        max: b.max,
        outcome: b.outcome as "low" | "balanced",
      })),
      thresholds: vertical.decision.thresholds,
      priorityNotes: Object.entries(vertical.decision.priorityNotes).map(
        ([priority, note]) => ({ priority, ...note })
      ),
    },
    outcomes: {
      low: outcomeToWire(vertical, "low"),
      balanced: outcomeToWire(vertical, "balanced"),
      high: outcomeToWire(vertical, "high"),
    },
    assistant: vertical.assistant,
    payoff: vertical.payoff,
  };
}

function outcomeToWire(vertical: Vertical, key: "low" | "balanced" | "high") {
  const { status, verdict, summary, coaching, risk } = vertical.outcomes[key];
  return { status, verdict, summary, coaching, risk: risk ?? null };
}

export function buildSystemPrompt(): string {
  const exemplar = JSON.stringify(toWireFormat(activeVertical), null, 1);

  return `You are the content engine for Method Marketing, a platform that teaches marketers an unfamiliar industry role through a Learn → Simulate → Produce arc: an interactive lesson, a hands-on simulation of the role's core decision inside a fictional software tool, and a toolkit of marketing artifacts the learner leaves with.

You generate one complete learning module (a "vertical") as JSON, targeting a specific industry role, personalized to the requesting user's product and goals.

## The simulation archetype

The simulation is a parameterized "operational dashboard" archetype: the learner configures a work item inside a fictional category-archetype tool (never a real vendor's product name), with locked contract fields, ONE consequential numeric decision rendered as a slider (the "frequencyCap" group — reuse its structure even if the domain decision is named differently, e.g. "reorder threshold" or "review SLA"), a secondary 3-option priority-style control, and a live forecast that reacts to the slider.

Non-negotiable mechanics:
- forecast.byCap must contain exactly one entry per integer from frequencyCap.min to frequencyCap.max inclusive. Numbers must tell a coherent story: at low values one forecast metric is great and the other suffers; in a middle band both are healthy; at high values the trade-off reverses. reachPct and deliveryPct are 0–100.
- decision.bands map slider values to outcomes: the first band whose max >= the chosen value wins; values above every band max fall through to the "high" outcome. Include a "low" band and a "balanced" band; every band max must be >= frequencyCap.min and < frequencyCap.max. Band boundaries must agree with the forecast numbers (the "balanced" range is where deliveryPct is at/near its best while reachPct is still strong).
- outcomes.low / .balanced / .high: "balanced" is the win state (status "win", risk null); the other two are status "risk" with a risk callout. Verdicts are punchy; coaching explains the why in plain language.
- outcome metric labels come from the forecast, so thresholds.reachGoodAt and thresholds.frequencyWasteAt must be consistent with the byCap numbers.
- priority.options: 2–4 options; priority.default must be one of their values; decision.priorityNotes must contain one entry per option value (tone "good" for the sensible default, "warn" for the others).

## Content rules

- The lesson has 3–5 cards and MUST include one "terms" card (4–6 terms). Card kinds: "flow" (the industry's value chain, clickable stages), "terms", "pressures" (what the role is measured on), "timeline" (a day in the seat). Every card carries 2–4 followUps (scripted Q&A) and a graceful fallbackAnswer.
- Substrings wrapped in [[double brackets]] render as highlighted domain vocabulary. Only wrap terms that appear in the terms card, and only in payoff emails/artifacts. Use them naturally, never explain them there.
- The briefing turns the lesson into an assignment: the mission, the two decisions the learner will make, 2–4 success criteria, and a 1–3 question knowledge check where exactly ONE option per question is correct.
- The payoff personalizes to the requesting user's product: the before email is generic AI-slop outreach for their product; the after email and every artifact are written in the target role's vocabulary, selling THEIR product to that role. Artifacts: 3–4 of kinds emailSequence, callScript, landingPage, ideas.
- The fictional simulation tool name must be plausible for the industry but not a real product.
- Write with craft: specific numbers, verbatim-sounding quotes, consequences a practitioner would recognize. No filler, no "delve", no exclamation marks.
- If expert notes are provided in the request, treat them as validated ground truth: every domain claim in the module should be traceable to them or to widely uncontroversial industry knowledge. Do not contradict them.

## Gold exemplar

The following module (ad-tech/media, campaign manager) is expert-authored and shows the exact wire format, depth, and voice expected. Match its quality; do not copy its content into other industries.

${exemplar}

Return ONLY the JSON object conforming to the provided schema.`;
}

export interface PromptOptions {
  /**
   * Validated facts about the target role from the expert-knowledge
   * database. v1 passes none; the retrieval layer plugs in here.
   */
  expertNotes?: string;
  /** Validation errors from a failed previous attempt, for one retry. */
  previousErrors?: string[];
}

export function buildUserPrompt(
  request: GenerationRequest,
  options: PromptOptions = {}
): string {
  const calibration = profileLabels(activeVertical.config, request.profile);

  const parts = [
    `Generate a Method Marketing module with these parameters:`,
    ``,
    `Target industry: ${request.targetIndustry}`,
    `Target role: ${request.targetRole}`,
    `The learner's product (all payoff artifacts market THIS): ${request.product.name} — ${request.product.description}`,
    `Learner calibration: ${calibration.join(" · ") || "none provided"}`,
  ];

  if (options.expertNotes) {
    parts.push(
      ``,
      `Expert-validated notes on this role (ground truth — compose from these):`,
      options.expertNotes
    );
  }

  if (options.previousErrors?.length) {
    parts.push(
      ``,
      `Your previous attempt failed validation. Fix ALL of these and regenerate the full module:`,
      ...options.previousErrors.map((e) => `- ${e}`)
    );
  }

  return parts.join("\n");
}
