# Scenario Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-slider Tier A simulation with a beat-based scenario engine (spec: `docs/superpowers/specs/2026-07-10-scenario-engine-design.md`) across three archetype shells, fully generated/validated/cached like today.

**Architecture:** New `lib/scenario/` module (types + deterministic meter engine); the built-in ad-tech sim re-authored as the `opsDashboard` exemplar scenario; wire schema v2 (`SCHEMA_VERSION = 2`); one shared ScenarioPlayer with three archetype skins; simulation-section prompts rebuilt from the research briefs.

**Tech Stack:** unchanged. **Content sources:** the two research briefs in `docs/research/` — beat copy and vocabulary MUST trace to them.

## Global Constraints

- Every commit: `npx tsc --noEmit`, `npm run lint`, `npm test` green.
- Determinism rules from the spec: exactly 3 meters, exactly one `decisive`, exactly one NumericBeat, 5–7 beats, byValue covers every integer, reachability of every band, "balanced" reachable.
- Old cores/saved modules with v1 sims are dropped, not migrated (shape check on read).
- Generation guardrails unchanged (maxRetries 0, req.signal, per-attempt logs, no structured outputs).
- Beat copy grounded in the briefs' ingredient banks (stats, jargon, pressure hooks). No invented statistics.

---

### Task 1: Scenario types + engine

**Files:** Create `lib/scenario/types.ts`, `lib/scenario/engine.ts`, `lib/scenario/engine.test.ts`.

**Produces:**
```ts
// types.ts — mirrors the spec contract exactly
export type Archetype = "opsDashboard" | "dealDesk" | "studioBoard";
export interface Meter { id; label; unit; start; min; max; goodDirection; decisive?: boolean }
export interface Effect { meter: string; delta: number }
export interface MessageBeat { kind: "message"; id; channel; from: {name; role}; subject?; body; choices: {label; effects: Effect[]; consequence: string}[] }
export interface NumericBeat { kind: "numeric"; id; prompt; control: {label; unit; min; max; default}; byValue: {value; effects: Effect[]; note}[] }
export type Beat = MessageBeat | NumericBeat;
export interface ScenarioSimulation { archetype; productName; environmentLabel; header: {label; value; sublabel?}[]; meters: Meter[]; beats: Beat[]; launchLabel }

// engine.ts — pure functions, all tested
export interface BeatSelection { beatId: string; choiceIndex?: number; value?: number }
export function applySelections(sim, selections: BeatSelection[]): Record<string, number>  // final clamped meter values
export function decisiveMeter(sim): Meter
export function decisiveRange(sim): { min: number; max: number }  // achievable via per-beat min/max deltas
export function endingFor(decisiveValue: number, bands, fallback): "low" | "balanced" | "high"
export function validateScenario(sim, bands): string[]           // ALL spec determinism rules
```

Tests: meter clamping; achievable-range math (hand-computed fixture); endingFor band edges; validateScenario catches each rule violation (missing decisive, 2 numeric beats, byValue gap, unreachable balanced, unknown meter id).

Steps: failing tests → implement → test → commit.

### Task 2: Author the ad-tech exemplar scenario

**Files:** Modify `lib/content` (wherever `activeVertical` lives — locate the simulation object) adding the authored scenario as a module-level export `adTechScenario: ScenarioSimulation` + matching `decision.bands` (NOT yet wired into Vertical); create `lib/scenario/exemplar.test.ts`.

Content (from existing expert module, expanded):
- Meters: `delivery` (Budget delivery %, start ~55, decisive), `reach` (Unique reach %, start ~90, down-good direction? no — up), `trust` (Advertiser trust, start 70).
- Beats (6): ① email from sales AE — IO just closed, expectations (choices set tone/trust); ② chat from ad-ops peer — pacing warning (choices: investigate/ignore/escalate); ③ **numeric** — frequency cap 1–10, byValue from the existing byCap story (delivery/reach deltas per value); ④ email from advertiser — "we want a big weekend push" (scope-pressure choices); ⑤ chat — priority question (the old Sponsorship/Standard/House trade as choices); ⑥ call note from AE — makegood rumblings (choices close the loop).
- Bands over final `delivery`: low ≤ 64, balanced ≤ 88, fallback high (tuned so the old lesson survives: cap-too-low starves delivery, cap-too-high wrecks reach/trust via beat effects).

Test: `validateScenario(adTechScenario, adTechBands)` returns `[]`; a walkthrough picking best choices + cap 3 lands "balanced".

Steps: author → test → tune numbers until green → commit.

### Task 3: Wire schema v2 + validators

**Files:** Modify `lib/generation/schema.ts`, `lib/generation/core.ts` (SCHEMA_VERSION = 2), tests.

- `GeneratedSimulationSchema` v2: `{ simulation: ScenarioSimulation-shaped zod, decision: {bands, fallback? no — fallback implied}, outcomes, assistant }` — build zod mirroring `lib/scenario/types.ts` (single source: define zod in schema.ts and derive TS types there? NO — keep `lib/scenario/types.ts` authoritative for the app; zod mirrors it; the tiling test + a `satisfies` check keep them aligned).
- `validateSimulationWire` v2 delegates to `validateScenario`.
- Remove v1-only checks from `validateVertical` (frequencyCap/byCap/priority) and add scenario checks (delegate to engine).
- `toVertical` simplification: wire simulation passes through (no byCap record conversion — byValue stays an array in app shape now); `priorityNotes` conversion deleted.

Tests: exemplar wire slice parses; tiling test still passes; corrupted scenarios rejected with engine messages.

Steps: failing tests → implement → commit. (Typecheck may require Task 4's flip to fully pass — if so, fold 3+4 into one commit.)

### Task 4: THE FLIP — app types, store, scenes

**Files:** Modify `lib/content` types (Vertical.simulation → ScenarioSimulation; delete legacy sim types + projectionForCap), `lib/store.ts` (choices → `selections: BeatSelection[]`; `launchSimulation(selections)` computes meters via engine, stores `finalMeters` + decisive value; retry resets selections), `components/scenes/Simulation.tsx` (replace with minimal unskinned ScenarioPlayer — Task 5 polishes), `components/scenes/Outcome.tsx` (ending from engine + meter recap bars), `components/scenes/Briefing.tsx` (only if it references removed fields), `lib/generation/mock.ts` (re-skin logic follows new shape), `lib/generation/prompt.ts` `toWireFormat` (new sim fields).

Definition of done: typecheck + lint + tests green; mock-mode Playwright walkthrough completes intro → payoff playing the scenario.

Steps: flip types → chase compiler → minimal player → engine-driven Outcome → mock walkthrough → commit.

### Task 5: ScenarioPlayer polish + opsDashboard skin

**Files:** Create `components/simulation/ScenarioPlayer.tsx`, `components/simulation/skins/OpsDashboard.tsx`; Simulation.tsx becomes the skin dispatcher.

Player: beat feed (one beat at a time, prior beats collapse to a log), channel-styled inbound cards (email/chat/call/ticket), choice buttons → consequence reveal → auto-advance, numeric beat with live byValue preview (delta chips per meter + note), persistent meter panel (bars with good-direction coloring; decisive meter starred), launch/finish CTA after last beat. Reduced-motion friendly.

OpsDashboard skin: evolve the existing AdServe chrome (sidebar, topbar, breadcrumb) around the player; meter panel styled as delivery gauges.

Steps: build → Playwright walkthrough on built-in module → commit.

### Task 6: dealDesk skin

**Files:** Create `components/simulation/skins/DealDesk.tsx`.

CRM chrome per spec: stage-path chevrons, opportunity header card (header fields), quote-panel styling for the numeric beat with "exceeds guardrails — routes to VP" chip when slider value falls in the high band (compute from bands), activity-timeline styling for the beat log. Meters as win-prob/margin/payback stat cards.

Steps: build → verify with a hand-made fixture vertical (unit-render or Playwright with mock swapped archetype) → commit.

### Task 7: studioBoard skin

**Files:** Create `components/simulation/skins/StudioBoard.tsx`.

Proofing-board chrome per spec: review columns with proof-card props derived from header/beats, version chips, comment-pin counts; engagement-health sidebar (budget-burn bar + utilization bar with a marked 85% red line when a meter's unit is % and label mentions utilization). Beats as review-queue events.

Steps: build → fixture verification → commit.

### Task 8: Prompts v2

**Files:** Modify `lib/generation/prompt.ts` (+ tests).

- `buildSimulationSystemPrompt` v2: scenario mechanics rules (spec determinism list, verbatim), archetype selection guidance ("pick by the role's native tool category: ops/dashboard work → opsDashboard; sales/deal work → dealDesk; creative/review work → studioBoard"), per-archetype vocabulary + statistics snippets FROM THE BRIEFS (deal desk: 4.2× churn, 19% win rate, guardrails; studio: 27% overrun, 85% utilization red line, change orders), and the authored ad-tech scenario exemplar.
- Foundation prompt: briefing "two decisions" guidance updated (numeric centerpiece + hardest message beat).
- Payoff prompt: unchanged (PayoffContext.simulation only needs productName).

Tests: system prompt contains mechanics + all three archetype names + exemplar marker; ingredient stats present.

Steps: failing tests → implement → commit.

### Task 9: End-to-end verification (real spend, ~$3.50 — confirm with user)

1. `npm test` + typecheck + lint + mock Playwright regression.
2. Real seed: "Fintech / Account Executives" (v2 cache is empty — full seed) → expect archetype `dealDesk`; play it in the browser.
3. Real seed: "Design agencies / Creative Directors" → expect `studioBoard`; play it.
4. Cached rerun on one pair (~$0.20) → cache works on v2.
5. Push; update memory (`module-cache-and-sim-plans`): archetypes shipped, Tier C flagged as future.

## Self-review

- Spec coverage: contract (T1), exemplar (T2), schema v2 + SCHEMA_VERSION (T3), engine-driven outcome (T4), three shells (T5–7), prompts from briefs (T8), verification (T9).
- Determinism rules appear twice by design: engine (`validateScenario`, runtime source of truth) and wire validators (delegate to it).
- Type consistency: `ScenarioSimulation`/`BeatSelection` defined once in `lib/scenario/types.ts`; zod mirrors with a tiling/`satisfies` test.
- Risk register: (a) exemplar authoring quality gates everything — Task 2 has its own walkthrough test; (b) the flip (T4) is the only non-incremental commit — bounded by compiler; (c) generation may pick wrong archetype — T8's selection guidance + T9 verifies both new archetypes explicitly.
