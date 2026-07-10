# Chunked Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full-module seeds run as three short API calls (each under Vercel's function cap) orchestrated by the client, with per-section validation and retries.

**Architecture:** See `docs/superpowers/specs/2026-07-10-chunked-generation-design.md`. Sections: ① foundation (industry/role/intro/lesson/briefing), ② simulation (simulation/decision/outcomes/assistant), ③ payoff (existing machinery). New routes `/api/generate/section` and `/api/generate/finish`; `/api/generate` returns `{seed: true}` on cache miss instead of generating.

**Tech Stack:** unchanged (Next 16 route handlers, @anthropic-ai/sdk 0.110, zod v4, vitest).

## Global Constraints

- Keep every Anthropic client `maxRetries: 0`, pass `req.signal`, log per attempt (`[generate] …`).
- No structured outputs anywhere (grammar-size 400s); prompt + zod + one retry per section.
- Section calls use `client.messages.stream` with `thinking: {type: "adaptive"}`, `max_tokens: 32000`, system prompt with `cache_control: {type: "ephemeral"}`.
- `maxDuration = 300` on all three routes.
- Cached and mock paths must behave byte-identically to today (except the new `seed` response on miss).
- Tests import from `"vitest"` explicitly; run `npm test`; typecheck + lint before each commit.

---

### Task 1: Section wire schemas

**Files:** Modify `lib/generation/schema.ts`; extend `lib/generation/schema.test.ts`.

**Produces:**
```ts
export const GeneratedFoundationSchema = GeneratedVerticalSchema.pick({
  industry: true, role: true, intro: true, lesson: true, briefing: true });
export const GeneratedSimulationSchema = GeneratedVerticalSchema.pick({
  simulation: true, decision: true, outcomes: true, assistant: true });
export type GeneratedFoundation = z.infer<typeof GeneratedFoundationSchema>;
export type GeneratedSimulation = z.infer<typeof GeneratedSimulationSchema>;
```

Steps: failing tests (exemplar wire subsets parse; missing-field rejects; `{...f, ...s, payoff}` parses as `GeneratedVerticalSchema` — proves the three sections tile the full schema exactly) → implement → `npm test` → commit.

### Task 2: Per-section semantic validators

**Files:** Modify `lib/generation/schema.ts`; extend `lib/generation/schema.test.ts`.

**Produces:**
```ts
export function validateFoundationWire(f: GeneratedFoundation): string[]; // terms card present; each quiz question exactly one correct
export function validateSimulationWire(s: GeneratedSimulation): string[]; // cap min<max + default in range; byCap one entry per integer cap (array form); bands sorted/in-range/balanced present; priority default ∈ options; priorityNotes cover options
```
These mirror the section-local subset of `validateVertical` (which stays as the finish-time safety net; wire byCap is an array, Vertical's is a record — hence separate functions). Steps: failing tests (valid exemplar slices → `[]`; corrupted copies → specific messages) → implement → test → commit.

### Task 3: Section prompts

**Files:** Modify `lib/generation/prompt.ts`; extend `lib/generation/prompt.test.ts`.

**Produces:**
```ts
export function buildFoundationSystemPrompt(): string; // framing + lesson/briefing content rules + exemplar subset {industry, role, intro, lesson, briefing}
export function buildFoundationUserPrompt(args: { request: GenerationRequest; previousErrors?: string[] }): string; // industry/role/product/calibration
export function buildSimulationSystemPrompt(): string; // simulation-archetype paragraph + ALL non-negotiable numeric mechanics + wire-keys rule + exemplar subset {simulation, decision, outcomes, assistant}
export function buildSimulationUserPrompt(args: { request: GenerationRequest; foundation: GeneratedFoundation; previousErrors?: string[] }): string; // request params + full foundation JSON as context
export interface PayoffContext { industry: string; role: string; lesson: { cards: … }; simulation: { productName: string } } // structural widening
export function buildPayoffUserPrompt(args: { request; core: PayoffContext; previousErrors? }): string; // signature loosened; VerticalCore still satisfies it
```
The monolithic `buildSystemPrompt`/`buildUserPrompt` are deleted with the monolith path (Task 4); update the prompt test that compared payoff-prompt size against `buildSystemPrompt`. Each section system prompt ends with the same "Return ONLY the JSON object … no fences" line. Steps: failing tests (subset exemplars present; foundation JSON embedded in simulation user prompt; previousErrors threaded; payoff accepts a wire-built context) → implement → test → commit.

### Task 4: Server — shared section runner + three routes

**Files:** Create `lib/generation/run-section.ts`, `app/api/generate/section/route.ts`, `app/api/generate/finish/route.ts`; modify `app/api/generate/route.ts`.

**Produces:**
```ts
// run-section.ts — the generic generate→parse→zod→semantic→retry loop used by every section
export interface SectionSpec<T> {
  label: string;                             // for logs: "foundation" | "simulation" | "payoff"
  systemPrompt: string;
  userPrompt: (previousErrors: string[]) => string;
  schema: z.ZodType<T>;
  semantic?: (value: T) => string[];
}
export async function runSection<T>(spec: SectionSpec<T>, signal: AbortSignal): Promise<T>; // throws after MAX_ATTEMPTS with joined errors
```
- `/api/generate/section`: zod body `{ section: 1|2, request: GenerationRequest, foundation?: GeneratedFoundation }` (`foundation` required when `section === 2`); dispatches to the matching spec; returns the section JSON.
- `/api/generate/finish`: body `{ request, foundation, simulation }` (zod-validated with the section schemas); runs payoff via `runSection` with `PayoffContext` built from the sections; assembles `{...foundation, ...simulation, payoff}` → `GeneratedVerticalSchema.parse` → `toVertical` → `validateVertical`; hard errors → 422 `{ error, section, issues }` (map by field prefix: simulation/decision/outcomes → 2, else 1); success → `saveCore` → `{ vertical, warnings, source: "model", coreId }`.
- `/api/generate`: mock + cached paths unchanged (cached path refactored onto `runSection` internally); cache miss returns `{ seed: true }` and never calls the model. Delete `generateWithModel` and the monolith prompts.
- All routes keep the `Anthropic.APIUserAbortError` / auth / rate-limit catch chain from today's route.

Steps: implement → typecheck → curl smoke tests with the dev daemon (invalid bodies 400; `/api/generate` mock mode returns mock; cache-hit pair returns cached ~85s **or** skip if cost-averse; cache-miss returns `{seed:true}` instantly) → commit.

### Task 5: Client orchestrator + non-JSON guard

**Files:** Modify `components/scenes/Setup.tsx`.

- `safeJson(res)` helper: reads text, tries `JSON.parse`, else throws `Error` with status-aware message ("The server timed out mid-generation…" for non-JSON bodies).
- `generate()` becomes: POST `/api/generate` → if `vertical` in response (mock/cached) proceed as today → if `seed`, run stages: section 1 → section 2 → finish, updating a real `stage` label per call ("Drafting the lesson & briefing…", "Parameterizing the simulation…", "Writing your artifacts…"); keep the 2.2s ticker only for sub-stage flavor within long calls or drop it (drop; show elapsed time instead). On failure, show which stage failed.
- Save/setVertical/next flow unchanged from today (uses finish response).

Steps: implement → typecheck + lint → commit.

### Task 6: Verification

1. `npm test`, `tsc`, lint — green.
2. Mock-mode Playwright pass: generate → module opens (regression).
3. Cached-path regression (~$0.20): existing Fintech/AE pair, new product name — still single-call, `source: "cached"`.
4. **Real seed via the section flow** (~$1.60, user-approved): fresh industry through the UI or curl chain (generate → section 1 → section 2 → finish); confirm per-stage logs, core saved, module valid. This also seeds a new industry.
5. Push; production seed test is the user's call afterwards.
6. Update memory (Vercel limitation resolved).

## Self-review

- Sections tile the schema exactly (Task 1's merge test enforces).
- Semantic rules assigned: quiz/terms → foundation; all numeric → simulation; [[term]] glossary check stays a finish-time warning. `validateVertical` remains the final net.
- Cached/mock behavior preserved; `seed: true` is the only response-shape change on `/api/generate`.
- Type consistency: `GeneratedFoundation`/`GeneratedSimulation` names used across Tasks 1–5; `PayoffContext` satisfied by both `VerticalCore` (cached path) and wire sections (finish path).
