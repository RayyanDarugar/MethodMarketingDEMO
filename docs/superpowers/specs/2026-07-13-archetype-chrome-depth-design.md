# Archetype chrome depth — software-realism pass

Status: **scoped 2026-07-13, not built.** Rayyan liked the beat/meter
scenario format after verifying the `dealDesk` archetype live, but flagged
that the interface itself reads thinner than the original AdServe Pro
mockup — a topbar + facts strip, not "sitting inside real software." This
spec scopes closing that gap. Do not implement until asked; low on usage
budget when this was written.

## Root cause (not a cost problem)

The chrome (`components/simulation/skins.tsx`, `ScenarioPlayer.tsx`) is a
**fixed, hand-built shell per archetype** — nothing about it is generated
per-module, so building it deeper costs zero extra tokens and doesn't touch
`SCHEMA_VERSION`, generation cost, or validation surface. The gap is that
this pass built ~180 lines of chrome for three archetypes (a topbar and a
generic facts grid); the original single-archetype AdServe mockup had a
real sidebar, a locked line-item form, breadcrumbs — more design/build time
per archetype than this pass spent. This is a scoping decision, not a
technical wall. The rejected alternative (model-generates-the-UI, "Option
B" from the original archetype spec) is where real cost and validation risk
live — explicitly out of scope here too, see Non-Goals.

## Goal

Make each archetype's **numeric beat** — the single interaction the role's
core tension actually lives in — render as a real software widget instead
of a generic slider-in-a-card, and deepen each archetype's surrounding
chrome (nav, locked-facts presentation) to match. Reuses data already
generated (`header`, `control`, `byValue`); no schema change required for
the baseline version.

## Non-goals

- No per-module generated layouts (the "Option B" DSL approach) — stays
  hand-built chrome, same as today.
- No drag-and-drop or persisted form state beyond the existing beat
  `answers` state already in `ScenarioPlayer`.
- No new meters, beats, or archetype types.
- No SCHEMA_VERSION bump for the baseline version (see Data below) — only
  if the optional numeric-value enrichment (stretch, below) is pursued.

## Per-archetype widget design

### `dealDesk` — quote-builder line

Real CPQ tools show a line-item row, not a bare slider. Render the numeric
beat as a table row: **Item / List Price / Discount % / Net** — item name
and list price come from existing `header` facts (e.g. "List ACV"); the
discount slider sits inline in its own cell instead of below the card;
`byValue[value].note` renders as a small inline annotation, matching how
CPQ tools show margin/guardrail text next to the discount field. The
"exceeds guardrails" chip (already built) moves next to the Net cell.

**Stretch (needs an additive field):** a computed Net Price requires
parsing a dollar amount out of a `header` fact's display string, which is
fragile. Cleaner: add an **optional** `numericValue?: number` alongside
the existing `value: string` on header facts. Optional + additive means
old-shaped generated content (missing the field) still renders fine via a
fallback — no version bump needed. Ship the widget's visual treatment
first without computed math; add live Net Price only if this field gets
added later.

### `opsDashboard` — locked line-item form

Closest to the original AdServe mockup. Render `header` facts as an actual
form: labeled fields in a bordered panel (Line item name / Budget / CPM /
Flight, styled like disabled/locked inputs, not a stat grid), with the
frequency-style slider embedded inside that same form panel — this is
literally what the original mockup did, just generalized to whatever
`header` facts a generated module supplies instead of hardcoded field
names.

### `studioBoard` — scope/rounds ledger

Render the numeric beat as a rounds ledger: a small horizontal tracker
(used vs. remaining rounds, styled like a real proofing tool's round
counter — filled/empty dots or a stepped bar) instead of a raw slider,
with `byValue[value].note` as the "what happens at N rounds" annotation.
Change-order framing (from the existing message beats) sits next to it as
a toggle-styled indicator, echoing tools like Ziflow's round tracker
(per the creative-agencies research brief).

## Chrome depth (shared across archetypes)

- **Static per-archetype left nav**: a fixed, hand-authored nav config per
  archetype (e.g. dealDesk always shows Deals / Quotes / Reports; studio
  always shows Boards / Reviews / Clients) — decorative, not generated,
  same pattern as the original AdServe sidebar. Restores "real app" feel
  with zero generation cost since it's identical across every module of
  that archetype.
- **Breadcrumb-style trail** above the locked-facts panel, derived from
  existing data (`archetype` label → `header[0]` → beat context) rather
  than a new generated field.

## Component architecture sketch

Extend `ArchetypeChrome` (currently `{ Frame, highRiskLabel, lowRiskLabel
}`) with two more render slots:

```ts
interface ArchetypeChrome {
  Frame: (props: { sim; children }) => ReactNode;      // unchanged
  NavItems: () => ReactNode;                             // new — static per-archetype sidebar/nav
  HeaderPanel: (props: { sim }) => ReactNode;             // new — replaces the generic facts grid
  NumericWidget: (props: {                                // new — replaces NumericBeatCard's generic slider
    beat: NumericBeat; value: number; onChange; committed; risk;
  }) => ReactNode;
  highRiskLabel: string;
  lowRiskLabel: string;
}
```

`ScenarioPlayer` calls `chrome.HeaderPanel` instead of its inline facts
grid, and `chrome.NumericWidget` instead of the shared slider-in-card
layout; `MessageBeatCard` and the meter panel stay archetype-agnostic
(chat/email bubbles and meter bars are already appropriately generic — the
research briefs confirm all three roles genuinely work through inbound
messages, so that part shouldn't change).

## Rough effort (for scoping only, not a committed plan)

1. `ArchetypeChrome` interface extension + wire into `ScenarioPlayer` (small).
2. `dealDesk` quote-line widget + nav + header panel (medium).
3. `opsDashboard` locked-form widget + nav + header panel (medium — closest
   to prior art, fastest of the three).
4. `studioBoard` rounds-ledger widget + nav + header panel (medium).
5. Manual verification per archetype against the already-seeded Fintech/AE
   (`dealDesk`) and creative-agency (`studioBoard`) cache entries — **no
   new paid generation required**, existing cached cores can be replayed
   through the new chrome.
6. Optional stretch: `header.numericValue` field + dealDesk Net Price math.

No spec changes to `lib/scenario/engine.ts`, `lib/generation/schema.ts`, or
prompts are required for the baseline (steps 1–5). Step 6 alone would touch
the wire schema (additive, optional — no `SCHEMA_VERSION` bump).
