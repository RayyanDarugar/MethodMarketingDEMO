# Module core cache + custom simulation plan

Status: **approved 2026-07-08** (both parts). Part 1 is ready to implement; Part 2
is a forward plan — do not build until explicitly requested.

Context: a full module generation is one long Opus call (~$1.60, ~6 min per
attempt). The `payoff` section is the only product-personalized slice of a
module; everything else (intro, lesson, briefing, simulation, decision,
outcomes, assistant) is pure industry+role content and therefore reusable
across users and products.

## Part 1 — Module core cache (approved, build next)

### Decisions made

- **Reuse model: split.** Cache the industry/role core (Vertical minus
  `payoff`) globally; on a match, regenerate only the payoff for the
  requester's product with a small model call (~$0.10–0.30, ~30s vs ~$1.60,
  ~6 min).
- **Matching: exact + cheap model matcher.** Normalized string match first;
  on miss, one Haiku call (`claude-haiku-4-5`) sees the request and the list
  of cached industry/role pairs (capped ~50) and picks a close-enough match
  or says `none`. Bias toward `none` when unsure — a false "fresh" costs
  $1.60; a false match costs correctness.
- Cache is **global across users** — safe because cores are
  product-agnostic by construction. Accepted nuance: the original
  requester's calibration answers subtly flavor a cached core.

### Data model

New table (append to `supabase/schema.sql`; run in Supabase SQL editor;
existing `mm_users` / `mm_sessions` / `mm_modules` unchanged — `mm_modules`
remains the per-user "my library" list):

```sql
create table if not exists public.mm_module_cores (
  id uuid primary key default gen_random_uuid(),
  industry text not null,             -- as the user typed it
  role text not null,
  industry_norm text not null,        -- lowercased/trimmed
  role_norm text not null,
  core jsonb not null,                -- Vertical minus payoff
  schema_version int not null,        -- bump to invalidate on wire-format changes
  use_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (industry_norm, role_norm, schema_version)
);
-- RLS: same demo-grade permissive anon policy as the other mm_ tables.
```

### Request flow (`/api/generate`, server-side)

1. Normalize industry+role → exact lookup in `mm_module_cores`
   (matching `schema_version`).
2. Miss → fetch cached pairs list → Haiku matcher → match or `none`.
3. **Hit** → payoff-only generation: prompt carries the requester's product,
   the core's glossary terms (for `[[term]]` markers), and role vocabulary —
   NOT the full gold exemplar (keep input small; a compact payoff exemplar is
   fine). Validate with a payoff-only zod schema + one validation-guided
   retry (same pattern as the full loop). Assemble `core + payoff` →
   return `source: "cached"`. Bump `use_count`.
4. **Miss** → full generation as today; on validated success, write the core
   back to the cache (strip `payoff`), then return.

### Constraints and posture

- Cache lookup/write failures must never block or fail a generation — log
  and fall through to the full path. Worst case is full price, never a
  broken run.
- Server Supabase access uses the same public env keys (demo-grade RLS,
  consistent with `lib/storage-supabase.ts`); tighten alongside real auth
  later.
- The existing per-request guardrails stay: `maxRetries: 0`,
  `req.signal` abort on disconnect, per-attempt logging.
- Structured outputs cannot be used for the full module schema (compiled
  grammar too large — API 400s); the payoff-only schema is much smaller and
  MAY fit, but don't assume — test, and fall back to prompt+zod like the
  full loop.
- UI: Setup scene surfaces which path ran (e.g. "Reused expert core ·
  personalized to <product>"); extend `source` union with `"cached"`.

## Part 2 — Custom simulations via archetype library (approved direction, DO NOT BUILD YET)

Problem: `Simulation.tsx` is one hard-coded ad-ops dashboard archetype;
generation only re-skins its text, so every industry looks like an ad
manager.

Chosen approach (A): **hand-built archetype library.** 4–5 visually distinct
simulation shells, each with its own parameter schema; generation picks an
archetype and fills its parameters (still one JSON blob — generation cost
stays ~flat; the spend is frontend build time, not tokens).

Candidate archetypes:

1. Operational dashboard (current one, extracted as archetype #1)
2. Creative-review / studio board (covers the "design studio" case)
3. Pipeline / deal CRM
4. Scheduling / dispatch calendar
5. Config wizard

Implementation sketch (for the future plan):

- Extract the current simulation renderer behind an archetype interface;
  `simulation.archetype` discriminates which shell renders.
- Define per-archetype parameter schemas (zod discriminated union in
  `lib/generation/schema.ts`); each keeps the non-negotiable mechanics
  (one consequential numeric decision, secondary control, live forecast,
  decision bands) mapped to archetype-appropriate framing.
- Prompt: per-archetype compact exemplars + selection guidance
  ("pick the archetype that matches the role's real tool category").
- Cached cores record their archetype; cache reuse unchanged.
- Rejected alternatives: (B) model-emitted layout DSL — more variety,
  +$0.30–0.60/run, validation gets hairy; revisit if archetypes feel
  limiting. (C) full React codegen per module — expensive, slow, unsafe.

## Queued next (not yet designed)

- **Feedback section**: user wants a way to collect feedback on generated
  modules so they improve over time. Brainstorm when they return — likely
  interacts with the cache (feedback on a core vs. on a payoff; a
  low-quality core should be evictable/regenerable).
