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
components/ProgressStepper.tsx  persistent Learn → Simulate → Produce indicator
components/scenes/              Intro, Setup, Lesson, Briefing, Simulation,
                                Outcome, Payoff
components/ui/Assistant.tsx     "I'm stuck" helper (swappable hint provider)
lib/content.ts                  ALL content + decision logic, typed, per vertical
lib/store.ts                    Zustand store: currentStep, profile, sim choices
lib/assistant.ts                provider seams: sim hints + lesson-card Q&A
lib/export.ts                   Claude context pack + artifact markdown export
```

### The one rule that matters

Every piece of lesson content, terminology, simulation configuration, decision logic, and outcome copy lives in `lib/content.ts` as a typed `Vertical` object. Components are presentation-only. Consequences:

- **Adding a vertical** is appending to the `VERTICALS` array — no component changes.
- **Swapping static content for AI-generated content** means replacing the source of the `Vertical` object (e.g. an API response) — the component layer is unchanged.
- **Tuning simulation logic** (frequency-cap bands, outcome copy, priority notes) is a data edit in `decision` / `outcomes`.

The Assistant follows the same principle: `components/ui/Assistant.tsx` only knows it asks a `HintProvider` (in `lib/assistant.ts`) for the next message. v1's provider returns scripted lines from content; a model-backed provider slots in behind the same interface.

### Deliberately not built yet (clean seams, not glued-on gaps)

Authentication and accounts, settings, multi-vertical selection UI, real model calls, persistence. Each has an obvious insertion point: vertical selection reads `VERTICALS`, hints swap the provider, persistence wraps the Zustand store.

## Develop

```bash
npm install
npm run dev
```

## Deploy

Zero-config on Vercel:

```bash
npm i -g vercel
vercel
```
