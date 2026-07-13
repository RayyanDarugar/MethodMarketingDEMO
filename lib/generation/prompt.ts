import {
  activeVertical,
  profileLabels,
  type Vertical,
} from "@/lib/content";
import type {
  GeneratedFoundation,
  GeneratedVertical,
  GenerationRequest,
} from "./schema";

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
    simulation: vertical.simulation,
    decision: { bands: vertical.decision.bands },
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

const FRAMING = `You are the content engine for Method Marketing, a platform that teaches marketers an unfamiliar industry role through a Learn → Simulate → Produce arc: an interactive lesson, a hands-on simulation of the role's core decision inside a fictional software tool, and a toolkit of marketing artifacts the learner leaves with.`;

const CRAFT_RULE = `- Write with craft: specific numbers, verbatim-sounding quotes, consequences a practitioner would recognize. No filler, no "delve", no exclamation marks.`;

const EXPERT_NOTES_RULE = `- If expert notes are provided in the request, treat them as validated ground truth: every domain claim in the module should be traceable to them or to widely uncontroversial industry knowledge. Do not contradict them.`;

const returnOnly = (what: string) =>
  `Return ONLY the ${what} JSON object, matching the exemplar's wire format exactly — no markdown fences, no commentary before or after. The wire format's keys are fixed in EVERY industry — re-theme the VALUES, never rename, drop, or add keys.`;

export function buildSystemPrompt(): string {
  const exemplar = JSON.stringify(toWireFormat(activeVertical), null, 1);

  return `${FRAMING}

You generate one complete learning module (a "vertical") as JSON, targeting a specific industry role, personalized to the requesting user's product and goals.

## The simulation archetype

The simulation is a parameterized "operational dashboard" archetype: the learner configures a work item inside a fictional category-archetype tool (never a real vendor's product name), with locked contract fields, ONE consequential numeric decision rendered as a slider (the "frequencyCap" group — reuse its structure even if the domain decision is named differently, e.g. "reorder threshold" or "review SLA"), a secondary 3-option priority-style control, and a live forecast that reacts to the slider.

Non-negotiable mechanics:
- The wire format's keys are fixed in EVERY industry — re-theme the VALUES, never rename, drop, or add keys. In particular, simulation.campaign always uses exactly lineItemName, advertiser, budget, currency, impressionsGoal, cpm, and flight, even when the domain has no ads (map the role's work item onto them, e.g. a loan book onto budget/impressionsGoal-style quantities).
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

Return ONLY the JSON object, matching the exemplar's wire format exactly — no markdown fences, no commentary before or after.`;
}

// ---------------------------------------------------------------------------
// Section prompts — chunked generation. Each section is one short model call
// (foundation → simulation → payoff); later sections receive earlier ones as
// context, so coherence survives the split. Foundation and simulation prompts
// deliberately exclude the requester's product: cached cores must stay
// product-agnostic by construction.
// ---------------------------------------------------------------------------

export function buildFoundationSystemPrompt(): string {
  const wire = toWireFormat(activeVertical);
  const exemplar = JSON.stringify(
    {
      industry: wire.industry,
      role: wire.role,
      intro: wire.intro,
      lesson: wire.lesson,
      briefing: wire.briefing,
    },
    null,
    1
  );

  return `${FRAMING}

You generate the FOUNDATION of one module as JSON: industry, role, intro, lesson, and briefing. Later, separate calls will generate the simulation and the payoff on top of your foundation — so the lesson's vocabulary and the briefing's assignment must stand on their own.

## Content rules

- The lesson has 3–5 cards and MUST include one "terms" card (4–6 terms). Card kinds: "flow" (the industry's value chain, clickable stages), "terms", "pressures" (what the role is measured on), "timeline" (a day in the seat). Every card carries 2–4 followUps (scripted Q&A) and a graceful fallbackAnswer.
- The briefing turns the lesson into an assignment: the mission, the two decisions the learner will make, 2–4 success criteria, and a 1–3 question knowledge check where exactly ONE option per question is correct.
- The briefing's two decisions describe what the simulation will demand: (1) the role's single consequential numeric decision, and (2) the hardest judgment call the learner will face handling inbound pressure. A separate call generates that scenario on top of your foundation.
${CRAFT_RULE}
${EXPERT_NOTES_RULE}

## Foundation exemplar

The following foundation (ad-tech/media, campaign manager) is expert-authored and shows the exact wire format, depth, and voice expected. Match its quality; do not copy its content into other industries.

${exemplar}

${returnOnly("foundation")}`;
}

export function buildFoundationUserPrompt(args: {
  request: GenerationRequest;
  expertNotes?: string;
  previousErrors?: string[];
}): string {
  const { request, expertNotes, previousErrors } = args;
  const calibration = profileLabels(activeVertical.config, request.profile);

  const parts = [
    `Generate the foundation for a Method Marketing module with these parameters:`,
    ``,
    `Target industry: ${request.targetIndustry}`,
    `Target role: ${request.targetRole}`,
    `Learner calibration: ${calibration.join(" · ") || "none provided"}`,
  ];

  if (expertNotes) {
    parts.push(
      ``,
      `Expert-validated notes on this role (ground truth — compose from these):`,
      expertNotes
    );
  }

  if (previousErrors?.length) {
    parts.push(
      ``,
      `Your previous attempt failed validation. Fix ALL of these and regenerate the full foundation object:`,
      ...previousErrors.map((e) => `- ${e}`)
    );
  }

  return parts.join("\n");
}

export function buildSimulationSystemPrompt(): string {
  const wire = toWireFormat(activeVertical);
  const exemplar = JSON.stringify(
    {
      simulation: wire.simulation,
      decision: wire.decision,
      outcomes: wire.outcomes,
      assistant: wire.assistant,
    },
    null,
    1
  );

  return `${FRAMING}

You generate the SIMULATION sections of one module as JSON: simulation, decision, outcomes, and assistant. The module's foundation (lesson and briefing) already exists and is provided in the request — your simulation must use its vocabulary and deliver exactly the assignment its briefing promises.

## The scenario

The simulation is a beat-based "day in the seat": 5–7 inbound events (beats) the learner must handle inside a fictional category-archetype tool (never a real vendor's product name). Message beats arrive from named people over email/chat/call/ticket and offer 2–4 responses; exactly ONE beat is numeric — the role's consequential quantitative decision, rendered as a slider. Every response moves persistent meters, and where the meters land decides the ending.

## Pick the archetype

Choose simulation.archetype by the target role's native tool category:
- "opsDashboard" — configure-and-monitor operational roles (campaign managers, ops, logistics): the numeric beat is a delivery/allocation setting.
- "dealDesk" — quota-carrying sales roles (account executives, sales leads): a CRM/quote console. The numeric beat is the discount or pricing call. Speak the trade's language: pipeline, stage, guardrails, give/get, NRR, CAC payback, deal desk, clawback. Real texture to draw on: ~19% average win rates; customers acquired at 30%+ discounts churn at ~4.2x the rate; discounts past ~15% route to VP approval.
- "studioBoard" — creative and review-owning roles (creative directors, account leads at agencies): a proofing/review board. The numeric beat is revision rounds or scope allowance on a fixed-fee engagement. Speak the trade's language: proofs, rounds, versions, change orders, scope creep, utilization, burn, retainer, goodwill work. Real texture: only ~1% of agencies bill all out-of-scope work; scope-crept projects overrun budgets ~27% on average; utilization above ~85% risks delivery failure and burnout.

Non-negotiable mechanics:
- simulation.meters: exactly 3. Exactly ONE has decisive: true — the tension axis of the role's core trade-off, where too LOW a final value produces the "low" ending (one failure mode) and too HIGH produces "high" (the opposite failure mode). The other two meters are narrative gauges with goodDirection set.
- simulation.beats: 5–7, exactly one kind "numeric". Message beats have 2–4 choices; every choice has effects (meter id + delta) and a one-line consequence in the sender's world. Effects may only reference declared meter ids.
- The numeric beat's byValue must contain exactly one row per integer from control.min to control.max inclusive; each row's note narrates the forecast at that value; its effects must move the decisive meter monotonically so low values land in the "low" band and high values past the last band.
- decision.bands are over the decisive meter's FINAL value (start plus all chosen deltas), ascending by max; include a "balanced" band (the win). Every ending — low, balanced, high — must be reachable by some path of choices: check that start + minimum possible deltas reaches the low band and start + maximum possible deltas exceeds the last band.
- simulation.header: 3–6 locked contract facts (who, how much, by when).
- outcomes.low / .balanced / .high: "balanced" is the win state (status "win", risk null); the other two are status "risk" with a risk callout. Verdicts are punchy; summaries narrate what the meters mean; coaching explains the why in plain language.
- The fictional simulation tool name must be plausible for the industry but not a real product.
${CRAFT_RULE}

## Scenario exemplar

The following simulation sections (ad-tech/media, campaign manager, opsDashboard archetype) are expert-authored and show the exact wire format, beat texture, and meter math expected. Match their quality; do not copy their content into other industries.

${exemplar}

${returnOnly("simulation-sections")}`;
}

export function buildSimulationUserPrompt(args: {
  request: GenerationRequest;
  foundation: GeneratedFoundation;
  previousErrors?: string[];
}): string {
  const { request, foundation, previousErrors } = args;

  const parts = [
    `Generate the simulation sections for this module:`,
    ``,
    `Target industry: ${request.targetIndustry}`,
    `Target role: ${request.targetRole}`,
    ``,
    `The module's foundation — use its vocabulary; the briefing's two decisions and success criteria are the contract your simulation must fulfill:`,
    JSON.stringify(foundation, null, 1),
  ];

  if (previousErrors?.length) {
    parts.push(
      ``,
      `Your previous attempt failed validation. Fix ALL of these and regenerate the full simulation-sections object:`,
      ...previousErrors.map((e) => `- ${e}`)
    );
  }

  return parts.join("\n");
}

/**
 * What the payoff prompt needs from the rest of the module — satisfied both
 * by a cached VerticalCore and by freshly generated wire sections.
 */
export interface PayoffContext {
  industry: string;
  role: string;
  lesson: GeneratedFoundation["lesson"];
  simulation: { productName: string };
}

/**
 * Payoff-only regeneration: the module core (lesson, simulation, outcomes…)
 * came from the cache or from the section flow; only the product-personalized
 * payoff is generated. Embeds just the payoff exemplar, so input stays ~10x
 * smaller than the full-module system prompt.
 */
export function buildPayoffSystemPrompt(): string {
  const exemplar = JSON.stringify(toWireFormat(activeVertical).payoff, null, 1);

  return `You are the content engine for Method Marketing. A learning module for a target industry role already exists; you generate ONLY its "payoff" section, personalized to the requesting user's product.

The payoff contains: a before/after email pair and a toolkit of 3-4 marketing artifacts (kinds: emailSequence, callScript, landingPage, ideas). The before email is generic AI-slop outreach for the user's product; the after email and every artifact are written in the target role's vocabulary, selling THEIR product to that role.

Rules:
- Substrings wrapped in [[double brackets]] render as highlighted domain vocabulary. Only wrap terms from the glossary provided in the request, and use them naturally — never explain them.
- Write with craft: specific numbers, verbatim-sounding quotes, consequences a practitioner would recognize. No filler, no "delve", no exclamation marks.

## Payoff exemplar

The following payoff (ad-tech/media, campaign manager) shows the exact wire format, depth, and voice expected. Match its quality; do not copy its content.

${exemplar}

Return ONLY the payoff JSON object, matching the exemplar's wire format exactly — no markdown fences, no commentary before or after.`;
}

export function buildPayoffUserPrompt(args: {
  request: GenerationRequest;
  core: PayoffContext;
  previousErrors?: string[];
}): string {
  const { request, core, previousErrors } = args;
  const termsCard = core.lesson.cards.find((c) => c.kind === "terms");
  const glossary =
    termsCard?.kind === "terms"
      ? termsCard.terms.map((t) => `${t.term}: ${t.definition}`)
      : [];

  const parts = [
    `Generate the payoff for this module:`,
    ``,
    `Target industry: ${core.industry}`,
    `Target role: ${core.role}`,
    `The learner's product (all payoff artifacts market THIS): ${request.product.name} — ${request.product.description}`,
    `The module's fictional tool (referenced, never sold): ${core.simulation.productName}`,
    ``,
    `Glossary the [[term]] markers may reference:`,
    ...glossary.map((g) => `- ${g}`),
  ];

  if (previousErrors?.length) {
    parts.push(
      ``,
      `Your previous attempt failed validation. Fix ALL of these and regenerate the full payoff object:`,
      ...previousErrors.map((e) => `- ${e}`)
    );
  }

  return parts.join("\n");
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
