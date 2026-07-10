# Scenario engine + simulation archetypes (Tier B)

Status: **approved 2026-07-10** (chat): Tier B scenario engine, full
conversion of all archetypes including the built-in ad-tech exemplar.
Research grounding: `docs/research/creative-agencies-sim-brief.md` and
`docs/research/fintech-ae-sim-brief.md` (sourced archetype specs + copy
ingredient banks — beat content MUST draw from these).

## Why

The Tier A simulation (locked fields → one slider → grade) reads as
barebones regardless of visual shell. Tier B makes the simulation a
multi-beat "day in the seat": inbound events, choices with visible
consequences on persistent meters, one numeric centerpiece beat, and a
computed narrative ending. Still 100% generated-as-JSON: deterministic,
zod+semantic validatable, cacheable, zero play-time model cost.

## The new simulation contract

```ts
simulation: {
  archetype: "opsDashboard" | "dealDesk" | "studioBoard",
  productName: string,          // fictional tool name
  environmentLabel: string,
  header: Array<{ label: string; value: string; sublabel?: string }>, // 3-6 locked contract facts (replaces the rigid campaign keys!)
  meters: Array<{               // exactly 3
    id: string; label: string; unit: string;      // "%", "months", "pts"
    start: number; min: number; max: number;
    goodDirection: "up" | "down";
    decisive?: boolean;         // exactly ONE meter is decisive (drives the ending bands)
  }>,
  beats: Array<MessageBeat | NumericBeat>,  // 5-7 total, exactly ONE NumericBeat
  launchLabel: string,
}

MessageBeat = {
  kind: "message",
  id: string,
  channel: "email" | "chat" | "call" | "ticket",
  from: { name: string; role: string },
  subject?: string,
  body: string,                 // the inbound event, written from brief material
  choices: Array<{              // 2-4
    label: string,
    effects: Array<{ meter: string; delta: number }>,
    consequence: string,        // one-line narrative shown after choosing
  }>,
}

NumericBeat = {                 // the signature slider moment, one per scenario
  kind: "numeric",
  id: string,
  prompt: string,               // the situation forcing the numeric call
  control: { label: string; unit: string; min: number; max: number; default: number },
  byValue: Array<{ value: number; effects: Array<{ meter: string; delta: number }>; note: string }>,
                                // one row per integer min..max (byCap generalized)
}

decision: {
  bands: Array<{ max: number; outcome: "low" | "balanced" }>, // over FINAL decisive-meter value
  fallback: "high",
}
outcomes: { low, balanced, high }  // unchanged schema; copy now narrates the meter story
```

Removed from the wire format: `frequencyCap`, `priority`, `forecast`,
`campaign`, `nav`, `breadcrumb`, `taskTitle`, `taskBrief`, `thresholds`,
`priorityNotes` (the archetype shells own their chrome; the give/get-style
choice becomes a MessageBeat). The briefing's `decisions` (2 entries) now
describe: (1) the numeric centerpiece, (2) the hardest message beat.

## Determinism & validation

- Meter arithmetic: final = start + Σ chosen deltas, clamped to [min,max].
- Ending: bands over the decisive meter's final value; first band whose
  `max >= value` wins; above all bands → "high".
- **Reachability validation** (per-section semantic rules): effects are
  additive and beats independent, so min/max achievable decisive value =
  start + Σ per-beat min/max deltas. Require: every band's range intersects
  the achievable range; "balanced" reachable; byValue covers every integer
  min..max; every effect's `meter` id exists; exactly one decisive meter;
  exactly one numeric beat; 2-4 choices per message beat.

## Archetype shells (frontend)

One shared **ScenarioPlayer** (beat feed, choice buttons, consequence
reveal, meter panel, numeric beat with byValue live-preview, launch/finish)
wrapped in three archetype skins that own chrome + meter styling:

- `opsDashboard` — evolved from today's AdServe-style chrome (sidebar nav,
  campaign header). Meters styled as delivery gauges.
- `dealDesk` — CRM: stage-path chevrons, opportunity header card, quote
  panel for the numeric beat, "exceeds guardrails — routes to VP" chip when
  slider enters the high band. Meters: win probability, margin/NRR, payback.
- `studioBoard` — proofing board: review columns, proof cards with version
  chips, comment pins; engagement-health sidebar (budget burn, utilization
  bar with the 85% red line). Meters: margin, client trust, utilization.

Beat channels render as the archetype's native surfaces (email pane, chat
ping, call note) but through shared components.

## Exemplar & generation

- The built-in ad-tech module's simulation is re-authored as an
  `opsDashboard` scenario (from its existing expert content: the IO,
  pacing tension, frequency-cap slider becomes the NumericBeat with the
  old byCap story; priority choice becomes a MessageBeat; advertiser
  pressure beats added).
- Simulation-section system prompt: archetype selection guidance ("pick
  the archetype matching the role's native tool category"), the scenario
  mechanics rules, per-archetype vocabulary/ingredient snippets distilled
  from the research briefs, and the ad-tech scenario exemplar.
- `SCHEMA_VERSION` → 2 (existing cores retire; re-seed on demand).
- Mock generator follows the converted built-in content automatically.

## Out of scope (explicitly)

- Tier C live-persona beats (flagged add-on later; beat structure leaves
  room: a future `kind: "live"`).
- Migrating old saved modules (schema_version 1 cores stop matching; saved
  library entries with old shape render via... they won't — old
  SavedModules with legacy sim shape are dropped on read via a shape check;
  acceptable demo cost, note in release).
- Authoring more than 3 archetypes.
