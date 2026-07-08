# Method Marketing

An interactive platform that teaches someone an unfamiliar industry role through a structured lesson, a hands-on simulation of the job, and a payoff showing what that understanding does to their own output.

**v1 ships one vertical:** ad-tech / media — campaign manager. The learner studies the role, configures and launches a line item in a simulated ad server (the frequency cap is the decision that matters), sees the delivery outcome, and ends with a side-by-side of the cold email they could write before vs. after.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion (scene transitions, card expansion, outcome reveal)
- Zustand (flow state)

## Architecture

The app is a scene-based flow on a single page. `currentStep` in the Zustand store walks through an ordered scene sequence; `app/page.tsx` swaps the active scene inside an `AnimatePresence` boundary.

```
app/page.tsx                    scene switcher, reads currentStep
app/layout.tsx                  fonts (Fraunces / Inter / IBM Plex Mono), globals
app/api/generate/route.ts      on-demand module generation (Claude, structured output)
components/ProgressStepper.tsx  persistent Learn → Simulate → Produce indicator
components/scenes/              Intro, Setup, Lesson, Briefing, Simulation,
                                Outcome, Payoff
components/ui/Assistant.tsx     "I'm stuck" helper (swappable hint provider)
lib/content.ts                  ALL content + decision logic, typed, per vertical
lib/store.ts                    Zustand store: currentStep, profile, active
                                vertical, sim choices
lib/verticals.ts                runtime registry (static + generated verticals)
lib/assistant.ts                provider seams: sim hints + lesson-card Q&A
lib/export.ts                   Claude context pack + artifact markdown export
lib/generation/                 schema (zod wire format + validators), prompt
                                (archetype contract + gold exemplar), mock
```

### The one rule that matters

Every piece of lesson content, terminology, simulation configuration, decision logic, and outcome copy lives in `lib/content.ts` as a typed `Vertical` object. Components are presentation-only. Consequences:

- **Adding a vertical** is appending to the `VERTICALS` array — no component changes.
- **Swapping static content for AI-generated content** means replacing the source of the `Vertical` object (e.g. an API response) — the component layer is unchanged.
- **Tuning simulation logic** (frequency-cap bands, outcome copy, priority notes) is a data edit in `decision` / `outcomes`.

The Assistant follows the same principle: `components/ui/Assistant.tsx` only knows it asks a `HintProvider` (in `lib/assistant.ts`) for the next message. v1's provider returns scripted lines from content; a model-backed provider slots in behind the same interface.

### Deliberately not built yet (clean seams, not glued-on gaps)

Authentication and accounts, settings, multi-vertical selection UI, real model calls, persistence. Each has an obvious insertion point: vertical selection reads `VERTICALS`, hints swap the provider, persistence wraps the Zustand store.

## On-demand generation

The Setup scene offers a "Custom" target: the user names their product, a
target industry, and a target role, and `POST /api/generate` produces a full
`Vertical` for it — lesson, briefing, parameterized simulation, outcomes, and
product-personalized artifacts — validated twice (zod schema + semantic checks
like forecast/band consistency) with one validation-guided retry.

- **With `ANTHROPIC_API_KEY`** (see `.env.example`): real generation via
  Claude structured outputs, using the expert-authored ad-tech module as the
  gold exemplar. `buildUserPrompt` has an `expertNotes` seam where a future
  expert-knowledge database plugs in retrieved, validated facts.
- **Without a key** (or `METHOD_GENERATION_MOCK=1`): demo mode — the built-in
  module is re-skinned around the user's product so the flow stays demoable.

Generated modules flow through the same component layer: the store swaps the
active `Vertical`, and every scene, assistant provider, and export reads from
it. Nothing else changes.

## Profiles & persistence

A lightweight sign-in gate (name-based, demo auth) fronts the flow. The
user's profile, their place in the flow, calibration answers, and a library
of generated modules all persist through a single `StorageAdapter` seam
(`lib/storage.ts`):

- **With Supabase configured** (`NEXT_PUBLIC_SUPABASE_URL` +
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`; run `supabase/schema.sql` once in the SQL
  editor): profiles, sessions, and modules live in the `mm_*` tables,
  written with the browser-safe publishable key. Identity is a
  device-generated UUID for now; real Supabase Auth tightens the RLS
  policies later without touching the app.
- **Without Supabase**: the same adapter interface backed by localStorage,
  and the Supabase adapter also falls back per-call if the tables aren't
  reachable.

Reloading the page resumes exactly where the user left off; generated
modules can be reopened from the Setup scene without regenerating.

## Develop

```bash
npm install
cp .env.example .env.local   # optional — enables real generation
npm run dev
```

## Deploy

Zero-config on Vercel:

```bash
npm i -g vercel
vercel
```
