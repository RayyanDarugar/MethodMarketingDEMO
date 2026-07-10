# Chunked generation — Vercel seed-timeout fix

Status: **approved 2026-07-10** (chat). Problem: a full seed generation runs
6–12 min inside one request; Vercel caps function wall-clock (~300s config,
~800s Pro ceiling) and streaming does not bypass the cap. Cached runs (~85s)
already fit.

## Design

Split the full-module generation into three sequential short calls, drawn
along the schema's dependency lines so coherent content is never split:

| Section | Fields | Coherence kept together |
|---|---|---|
| ① Foundation | industry, role, intro, lesson, briefing | quiz references lesson; terms card feeds later sections |
| ② Simulation | simulation, decision, outcomes, assistant | all numeric rules (byCap/bands/thresholds/priority) in one call |
| ③ Payoff | payoff | already exists — the cache-hit machinery |

**API (server stateless; browser carries sections between calls):**

- `POST /api/generate` — unchanged for mock and cache-hit (fast paths fit
  the cap). On cache miss returns `{ seed: true }` instead of generating.
- `POST /api/generate/section` — body `{ section: 1|2, request, foundation? }`;
  generates one section, validates with a per-section zod schema + that
  section's slice of the semantic rules, one validation-guided retry
  internally (~2×2min worst case, under the cap). Section 2 receives
  section 1's output as context.
- `POST /api/generate/finish` — body `{ request, foundation, simulation }`;
  runs the payoff generation (≈ today's cached-path call), assembles the
  full wire object, runs full validation as a safety net, saves the core,
  returns `{ vertical, warnings, source: "model", coreId }`. Cross-section
  failures return 422 with the offending section number so the client can
  re-run just that section.

**Client (Setup.tsx):** the cosmetic stage ticker becomes a real
orchestrator — generate → (on `seed`) section 1 → section 2 → finish — with
stage labels reflecting the actual call in flight. A section failure costs a
   section retry (~$0.30), not a full module (~$1.60). All fetches gain a
non-JSON guard so platform error pages surface as human messages, not
`Unexpected token 'A'`.

**Unchanged:** cached path, mock path, feedback, dashboard, cache tables —
a core seeded via sections is identical to one seeded monolithically.

**Economics/latency:** cost ~flat (context re-sent between sections, but
each call's output is smaller and system prefixes are cache-eligible);
seed latency still ~8–12 min but visibly progressing and Vercel-safe on any
plan; validation retries now scoped to one section.

**Rejected:** streaming-only (doesn't bypass the cap), Trigger.dev/Inngest
(vendor + config for a demo), Batches API (unbounded latency; revisit for
bulk pre-seeding at 50% cost).
