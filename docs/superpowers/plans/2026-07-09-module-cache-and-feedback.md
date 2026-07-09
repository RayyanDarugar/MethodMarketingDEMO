# Module Core Cache + Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache the product-agnostic core of generated modules in Supabase so matched industry/role requests cost ~$0.20 (payoff-only regeneration) instead of ~$1.60, and collect per-scene + completion feedback that gates bad cores out of the cache.

**Architecture:** A global `mm_module_cores` table stores `Vertical` minus `payoff`. `/api/generate` tries exact-normalized lookup, then a Haiku matcher over cached pairs; on a hit it regenerates only the payoff for the requester's product and assembles core+payoff. Feedback rows (`mm_feedback`) carry ±1 thumbs per scene and a 1–5 completion rating; a core whose gating score sums ≤ −2 is skipped and replaced by the next full generation.

**Tech Stack:** Next.js 16 (App Router route handlers), `@anthropic-ai/sdk` 0.110, `@supabase/supabase-js`, zod v4, vitest (new devDependency), Tailwind v4 with shadcn-style tokens, zustand.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-08-module-core-cache-design.md` — Part 1 + approved feedback decisions (per-scene thumbs AND completion rating; store + gate the cache; no prompt-feeding).
- Cache/feedback failures must NEVER block or fail a generation — log and fall through to the full path.
- Keep existing guardrails on every Anthropic client: `maxRetries: 0`, abort `signal` passed through on streams, per-attempt `console.log`s.
- Do NOT use structured outputs (`output_config`) anywhere — the full schema 400s (grammar too large); payoff uses the same prompt+zod+retry pattern as the full loop.
- Matcher model: `claude-haiku-4-5` (exact string). Generation model: existing `MODEL` const (env `GENERATION_MODEL` ?? `claude-opus-4-8`).
- `SCHEMA_VERSION = 1` for all cached cores.
- Supabase access (server + client) uses the public env keys `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; when unset, all cache/feedback functions no-op gracefully.
- Payoff-scene thumbs never gate cores (payoff is product-specific); only `lesson`, `simulation`, and `overall` feedback gates.
- Tests import `describe/it/expect` explicitly from `"vitest"` (no globals config). Run with `npm test`.
- Commit after every task. Never commit `.env.local`.

---

### Task 0: Commit the pending working-tree changes

Yesterday's fixes (structured-outputs removal, cost guardrails) are uncommitted and this work builds on them.

**Files:**
- Commit (no edits): `app/api/generate/route.ts`, `lib/generation/prompt.ts`

- [ ] **Step 1: Verify the tree contains only those two modified files**

Run: `git status --short`
Expected: ` M app/api/generate/route.ts` and ` M lib/generation/prompt.ts` only. If anything else appears, stop and ask.

- [ ] **Step 2: Typecheck, then commit**

Run: `npx tsc --noEmit`
Expected: no output (pass).

```bash
git add app/api/generate/route.ts lib/generation/prompt.ts
git commit -m "Drop structured outputs (schema exceeds grammar limit); add cost guardrails

Generation now relies on the exemplar prompt + zod validation retry.
Client: maxRetries 0 (no silent re-billing), req.signal abort on
disconnect, per-attempt logging.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 1: Database schema — `mm_module_cores`, `mm_feedback`, `mm_modules.core_id`

**Files:**
- Modify: `supabase/schema.sql` (append at end)

**Interfaces:**
- Produces: tables `mm_module_cores` (unique on `industry_norm, role_norm, schema_version`) and `mm_feedback`; nullable `core_id` column on `mm_modules`. Consumed by Tasks 5, 7, 8, 9.

- [ ] **Step 1: Append the new DDL to `supabase/schema.sql`**

```sql
-- ---------------------------------------------------------------------------
-- Module core cache + feedback (2026-07-09). Cores are GLOBAL (not per-user):
-- a core is a Vertical minus its product-personalized `payoff`, so sharing
-- across users leaks nothing beyond the industry/role pair.
-- ---------------------------------------------------------------------------

create table if not exists public.mm_module_cores (
  id uuid primary key default gen_random_uuid(),
  industry text not null,            -- as the user typed it
  role text not null,
  industry_norm text not null,       -- lowercased/trimmed
  role_norm text not null,
  core jsonb not null,               -- Vertical minus payoff
  schema_version int not null,
  use_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (industry_norm, role_norm, schema_version)
);

create table if not exists public.mm_feedback (
  id uuid primary key default gen_random_uuid(),
  core_id uuid references public.mm_module_cores (id) on delete set null,
  module_id text not null,           -- vertical.id the learner was viewing
  user_id uuid,                      -- nullable; demo identity pointer
  scene text not null,               -- 'lesson' | 'simulation' | 'payoff' | 'overall'
  score int not null,                -- thumbs: 1 / -1; overall: 1..5
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists mm_feedback_core on public.mm_feedback (core_id);

alter table public.mm_modules add column if not exists core_id uuid;

alter table public.mm_module_cores enable row level security;
alter table public.mm_feedback enable row level security;

drop policy if exists "demo anon access" on public.mm_module_cores;
create policy "demo anon access" on public.mm_module_cores
  for all to anon using (true) with check (true);

drop policy if exists "demo anon access" on public.mm_feedback;
create policy "demo anon access" on public.mm_feedback
  for all to anon using (true) with check (true);
```

- [ ] **Step 2: Ask the user to run the appended SQL in the Supabase SQL editor** (Dashboard → SQL Editor → paste just the new block → Run). The whole file is idempotent, so pasting the full file is also safe.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "Add mm_module_cores + mm_feedback tables and mm_modules.core_id

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Vitest setup + pure core-split helpers

**Files:**
- Create: `lib/generation/core.ts`, `lib/generation/core.test.ts`, `vitest.config.ts`
- Modify: `package.json` (devDependency + script)

**Interfaces:**
- Produces (consumed by Tasks 4, 5, 7):

```ts
export const SCHEMA_VERSION = 1;
export type VerticalCore = Omit<Vertical, "payoff">;
export function normalizePair(industry: string, role: string): { industryNorm: string; roleNorm: string };
export function stripPayoff(vertical: Vertical): VerticalCore;
export function assembleVertical(core: VerticalCore, payoff: Vertical["payoff"]): Vertical; // fresh id: `${core.id}-r<base36>`
```

- [ ] **Step 1: Install vitest and add the test script**

Run: `npm install -D vitest`
In `package.json` scripts add: `"test": "vitest run"`

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 3: Write the failing test `lib/generation/core.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { activeVertical } from "@/lib/content";
import {
  assembleVertical,
  normalizePair,
  stripPayoff,
} from "@/lib/generation/core";

describe("normalizePair", () => {
  it("lowercases, trims, and collapses inner whitespace", () => {
    expect(normalizePair("  FinTech ", "Account  Executives")).toEqual({
      industryNorm: "fintech",
      roleNorm: "account executives",
    });
  });
});

describe("stripPayoff / assembleVertical", () => {
  it("round-trips a vertical, minting a fresh id", () => {
    const core = stripPayoff(activeVertical);
    expect("payoff" in core).toBe(false);
    const rebuilt = assembleVertical(core, activeVertical.payoff);
    expect(rebuilt.payoff).toEqual(activeVertical.payoff);
    expect(rebuilt.lesson).toEqual(activeVertical.lesson);
    expect(rebuilt.id).toMatch(new RegExp(`^${activeVertical.id}-r[a-z0-9]+$`));
  });
});
```

- [ ] **Step 4: Run to verify failure**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/generation/core`.

- [ ] **Step 5: Implement `lib/generation/core.ts`**

```ts
import type { Vertical } from "@/lib/content";

/**
 * Core = a Vertical minus its product-personalized payoff. Cores are safe to
 * share across users/products; bump SCHEMA_VERSION when the wire format
 * changes so stale cores stop matching.
 */
export const SCHEMA_VERSION = 1;

export type VerticalCore = Omit<Vertical, "payoff">;

export function normalizePair(industry: string, role: string) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return { industryNorm: norm(industry), roleNorm: norm(role) };
}

export function stripPayoff(vertical: Vertical): VerticalCore {
  const { payoff: _payoff, ...core } = vertical;
  return core;
}

export function assembleVertical(
  core: VerticalCore,
  payoff: Vertical["payoff"]
): Vertical {
  return {
    ...core,
    payoff,
    id: `${core.id}-r${Date.now().toString(36)}`,
  };
}
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npm test` — Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/generation/core.ts lib/generation/core.test.ts vitest.config.ts package.json package-lock.json
git commit -m "Add core-split helpers and vitest setup

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Export a payoff-only wire schema

**Files:**
- Modify: `lib/generation/schema.ts` (the `payoff:` object inside `GeneratedVerticalSchema`, currently ~lines 344–362)
- Create: `lib/generation/schema.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 4, 7):

```ts
export const GeneratedPayoffSchema: z.ZodType; // the exact payoff object schema
export type GeneratedPayoff = z.infer<typeof GeneratedPayoffSchema>;
```

- [ ] **Step 1: Write the failing test `lib/generation/schema.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { activeVertical } from "@/lib/content";
import { GeneratedPayoffSchema } from "@/lib/generation/schema";

describe("GeneratedPayoffSchema", () => {
  it("accepts the exemplar's payoff", () => {
    const parsed = GeneratedPayoffSchema.safeParse(activeVertical.payoff);
    expect(parsed.success).toBe(true);
  });

  it("rejects a payoff missing artifacts", () => {
    const { toolkit: _t, ...broken } = activeVertical.payoff;
    expect(GeneratedPayoffSchema.safeParse(broken).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (`GeneratedPayoffSchema` not exported).

- [ ] **Step 3: Extract the payoff schema in `lib/generation/schema.ts`**

Cut the object currently inlined at `payoff:` inside `GeneratedVerticalSchema` into a named export placed after `EmailCardSchema`/`ArtifactSchema`, and reference it:

```ts
export const GeneratedPayoffSchema = z.object({
  headline: z.string(),
  subhead: z.string(),
  before: EmailCardSchema,
  after: EmailCardSchema,
  toolkit: z.object({
    title: z.string(),
    subhead: z.string(),
    artifacts: z.array(ArtifactSchema).min(3).max(4),
  }),
  exporting: z.object({
    title: z.string(),
    body: z.string(),
    copyLabel: z.string(),
    downloadLabel: z.string(),
  }),
  completion: z.object({ title: z.string(), body: z.string() }),
  restartLabel: z.string(),
});

export type GeneratedPayoff = z.infer<typeof GeneratedPayoffSchema>;
```

and inside `GeneratedVerticalSchema`: `payoff: GeneratedPayoffSchema,`

- [ ] **Step 4: Run tests + typecheck** — `npm test` → PASS; `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add lib/generation/schema.ts lib/generation/schema.test.ts
git commit -m "Extract GeneratedPayoffSchema for payoff-only regeneration

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Payoff-only prompts

**Files:**
- Modify: `lib/generation/prompt.ts`
- Create: `lib/generation/prompt.test.ts`

**Interfaces:**
- Consumes: `VerticalCore` (Task 2).
- Produces (consumed by Task 7):

```ts
export function buildPayoffSystemPrompt(): string;
export function buildPayoffUserPrompt(args: {
  request: GenerationRequest;
  core: VerticalCore;
  previousErrors?: string[];
}): string;
```

- [ ] **Step 1: Write the failing test `lib/generation/prompt.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { activeVertical } from "@/lib/content";
import { stripPayoff } from "@/lib/generation/core";
import {
  buildPayoffSystemPrompt,
  buildPayoffUserPrompt,
  buildSystemPrompt,
} from "@/lib/generation/prompt";

const request = {
  product: { name: "Agent Dynamo", description: "Custom AI agents" },
  targetIndustry: "Fintech",
  targetRole: "Account Executives",
  profile: {},
};

describe("payoff prompts", () => {
  it("system prompt embeds only the payoff exemplar (much smaller than full)", () => {
    const payoffSystem = buildPayoffSystemPrompt();
    expect(payoffSystem).toContain('"artifacts"');
    expect(payoffSystem.length).toBeLessThan(buildSystemPrompt().length / 2);
  });

  it("user prompt carries the product and the core's glossary terms", () => {
    const core = stripPayoff(activeVertical);
    const prompt = buildPayoffUserPrompt({ request, core });
    expect(prompt).toContain("Agent Dynamo");
    const termsCard = core.lesson.cards.find((c) => c.kind === "terms");
    expect(termsCard).toBeDefined();
    if (termsCard?.kind === "terms") {
      expect(prompt).toContain(termsCard.terms[0].term);
    }
  });

  it("threads previous validation errors for the retry", () => {
    const core = stripPayoff(activeVertical);
    const prompt = buildPayoffUserPrompt({
      request,
      core,
      previousErrors: ["toolkit.artifacts: too few items"],
    });
    expect(prompt).toContain("too few items");
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL (exports missing).

- [ ] **Step 3: Implement in `lib/generation/prompt.ts`** (append; reuse existing `toWireFormat` internals — note `toWireFormat` is module-private, use it directly):

```ts
import { stripPayoff, type VerticalCore } from "@/lib/generation/core";

/**
 * Payoff-only regeneration: the module core (lesson, simulation, outcomes…)
 * came from the cache; only the product-personalized payoff is generated.
 * Embeds just the payoff exemplar, so input stays ~10x smaller than the
 * full-module system prompt.
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
  core: VerticalCore;
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
```

(`stripPayoff` import is used only for its type re-export side; if unused, drop it and import `type VerticalCore` alone.)

- [ ] **Step 4: Run tests + typecheck** — `npm test` → PASS; `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add lib/generation/prompt.ts lib/generation/prompt.test.ts
git commit -m "Add payoff-only prompts for cached-core personalization

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Feedback gating score (pure logic)

**Files:**
- Create: `lib/feedback/scoring.ts`, `lib/feedback/scoring.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 6, 8):

```ts
export type FeedbackScene = "lesson" | "simulation" | "payoff" | "overall";
export interface FeedbackRow { scene: FeedbackScene; score: number }
export function gatingScore(rows: FeedbackRow[]): number;
export const BLOCK_THRESHOLD = -2;
export function isCoreBlocked(rows: FeedbackRow[]): boolean; // gatingScore(rows) <= BLOCK_THRESHOLD
```

- [ ] **Step 1: Write the failing test `lib/feedback/scoring.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  gatingScore,
  isCoreBlocked,
  type FeedbackRow,
} from "@/lib/feedback/scoring";

describe("gatingScore", () => {
  it("sums scene thumbs, ignores payoff, maps overall ratings", () => {
    const rows: FeedbackRow[] = [
      { scene: "lesson", score: 1 },      // +1
      { scene: "simulation", score: -1 }, // -1
      { scene: "payoff", score: -1 },     // ignored (product-specific)
      { scene: "overall", score: 5 },     // +1 (>=4)
      { scene: "overall", score: 2 },     // -1 (<=2)
      { scene: "overall", score: 3 },     // 0 (neutral)
    ];
    expect(gatingScore(rows)).toBe(0);
  });
});

describe("isCoreBlocked", () => {
  it("blocks at -2, not at -1", () => {
    const down = (scene: "lesson" | "simulation"): FeedbackRow => ({ scene, score: -1 });
    expect(isCoreBlocked([down("lesson")])).toBe(false);
    expect(isCoreBlocked([down("lesson"), down("simulation")])).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement `lib/feedback/scoring.ts`**

```ts
/**
 * Cache-gating signal. Thumbs on core scenes count ±1; the completion
 * rating maps 4-5 → +1, 1-2 → -1, 3 → 0. Payoff thumbs never gate a core —
 * the payoff is product-specific, not the core's fault.
 */

export type FeedbackScene = "lesson" | "simulation" | "payoff" | "overall";

export interface FeedbackRow {
  scene: FeedbackScene;
  score: number;
}

export const BLOCK_THRESHOLD = -2;

export function gatingScore(rows: FeedbackRow[]): number {
  let sum = 0;
  for (const row of rows) {
    if (row.scene === "payoff") continue;
    if (row.scene === "overall") {
      sum += row.score >= 4 ? 1 : row.score <= 2 ? -1 : 0;
    } else {
      sum += Math.sign(row.score);
    }
  }
  return sum;
}

export function isCoreBlocked(rows: FeedbackRow[]): boolean {
  return gatingScore(rows) <= BLOCK_THRESHOLD;
}
```

- [ ] **Step 4: Run tests** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/feedback/scoring.ts lib/feedback/scoring.test.ts
git commit -m "Add feedback gating score for the core cache

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Server-side cache access + Haiku matcher

**Files:**
- Create: `lib/generation/cache.ts`, `lib/generation/cache.test.ts` (tests cover `parseMatcherReply` only — the Supabase calls are thin I/O wrappers verified end-to-end in Task 10)

**Interfaces:**
- Consumes: `normalizePair`, `stripPayoff`, `SCHEMA_VERSION`, `VerticalCore` (Task 2); `isCoreBlocked`, `FeedbackRow` (Task 5).
- Produces (consumed by Task 7):

```ts
export interface CachedCore { id: string; industry: string; role: string; core: VerticalCore }
export async function lookupCoreExact(industry: string, role: string): Promise<CachedCore | null>; // null when missing, blocked, or Supabase unset/erroring
export async function listCandidatePairs(): Promise<{ industry: string; role: string }[]>; // ≤50, blocked cores excluded
export function parseMatcherReply(text: string, candidates: { industry: string; role: string }[]): { industry: string; role: string } | null;
export async function matchPair(industry: string, role: string, candidates: { industry: string; role: string }[]): Promise<{ industry: string; role: string } | null>;
export async function saveCore(vertical: Vertical, industry: string, role: string): Promise<string | null>; // upserts, detaches old feedback, returns core id
export async function bumpUseCount(id: string): Promise<void>;
```

- [ ] **Step 1: Write the failing test `lib/generation/cache.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { parseMatcherReply } from "@/lib/generation/cache";

const candidates = [
  { industry: "Fintech", role: "Account Executives" },
  { industry: "Healthcare", role: "Practice Managers" },
];

describe("parseMatcherReply", () => {
  it("resolves a bare index reply", () => {
    expect(parseMatcherReply("2", candidates)).toEqual(candidates[1]);
  });
  it("resolves an index inside prose", () => {
    expect(parseMatcherReply("Best match: 1", candidates)).toEqual(candidates[0]);
  });
  it("returns null for 'none', out-of-range, or garbage", () => {
    expect(parseMatcherReply("none", candidates)).toBeNull();
    expect(parseMatcherReply("0", candidates)).toBeNull();
    expect(parseMatcherReply("7", candidates)).toBeNull();
    expect(parseMatcherReply("no close match (see 1 above)", candidates)).toBeNull();
  });
});
```

Note the last case: replies that contain the word "none"/"no" take priority over digits.

- [ ] **Step 2: Run to verify failure** — `npm test` → FAIL.

- [ ] **Step 3: Implement `lib/generation/cache.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Vertical } from "@/lib/content";
import {
  normalizePair,
  stripPayoff,
  SCHEMA_VERSION,
  type VerticalCore,
} from "@/lib/generation/core";
import { isCoreBlocked, type FeedbackRow } from "@/lib/feedback/scoring";

/**
 * Global module-core cache (server-side). Every function degrades to a
 * cache miss / no-op on any failure: the cache saves money, it must never
 * cost a run.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MATCHER_MODEL = "claude-haiku-4-5";
const CANDIDATE_CAP = 50;

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!URL_ENV || !KEY_ENV) return null;
  if (!client) client = createClient(URL_ENV, KEY_ENV);
  return client;
}

export interface CachedCore {
  id: string;
  industry: string;
  role: string;
  core: VerticalCore;
}

async function coreFeedback(db: SupabaseClient, coreId: string): Promise<FeedbackRow[]> {
  const { data, error } = await db
    .from("mm_feedback")
    .select("scene, score")
    .eq("core_id", coreId);
  if (error) throw error;
  return (data ?? []) as FeedbackRow[];
}

export async function lookupCoreExact(
  industry: string,
  role: string
): Promise<CachedCore | null> {
  const db = supabase();
  if (!db) return null;
  try {
    const { industryNorm, roleNorm } = normalizePair(industry, role);
    const { data, error } = await db
      .from("mm_module_cores")
      .select("id, industry, role, core")
      .eq("industry_norm", industryNorm)
      .eq("role_norm", roleNorm)
      .eq("schema_version", SCHEMA_VERSION)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (isCoreBlocked(await coreFeedback(db, data.id))) {
      console.log(`[cache] core ${data.id} is feedback-blocked; regenerating`);
      return null;
    }
    return {
      id: data.id,
      industry: data.industry,
      role: data.role,
      core: data.core as VerticalCore,
    };
  } catch (error) {
    console.warn("[cache] exact lookup failed:", error);
    return null;
  }
}

export async function listCandidatePairs(): Promise<
  { industry: string; role: string }[]
> {
  const db = supabase();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("mm_module_cores")
      .select("id, industry, role")
      .eq("schema_version", SCHEMA_VERSION)
      .order("use_count", { ascending: false })
      .limit(CANDIDATE_CAP);
    if (error) throw error;
    const pairs: { industry: string; role: string }[] = [];
    for (const row of data ?? []) {
      if (!isCoreBlocked(await coreFeedback(db, row.id))) {
        pairs.push({ industry: row.industry, role: row.role });
      }
    }
    return pairs;
  } catch (error) {
    console.warn("[cache] candidate listing failed:", error);
    return [];
  }
}

export function parseMatcherReply(
  text: string,
  candidates: { industry: string; role: string }[]
): { industry: string; role: string } | null {
  const reply = text.trim().toLowerCase();
  if (/\bnone\b|\bno\b/.test(reply)) return null;
  const match = reply.match(/\d+/);
  if (!match) return null;
  const index = Number(match[0]) - 1;
  return candidates[index] ?? null;
}

export async function matchPair(
  industry: string,
  role: string,
  candidates: { industry: string; role: string }[]
): Promise<{ industry: string; role: string } | null> {
  if (candidates.length === 0) return null;
  try {
    const anthropic = new Anthropic({ maxRetries: 0 });
    const list = candidates
      .map((c, i) => `${i + 1}. ${c.industry} / ${c.role}`)
      .join("\n");
    const response = await anthropic.messages.create({
      model: MATCHER_MODEL,
      max_tokens: 16,
      system:
        "You match a requested industry/role pair against a list of existing learning modules. Reply with ONLY the number of a candidate that teaches essentially the same role in essentially the same industry (synonyms and phrasing differences are fine), or the word none. When unsure, reply none — a wrong match is worse than a miss.",
      messages: [
        {
          role: "user",
          content: `Requested: ${industry} / ${role}\n\nExisting modules:\n${list}`,
        },
      ],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const matched = parseMatcherReply(text, candidates);
    console.log(
      `[cache] matcher: "${industry} / ${role}" -> ${
        matched ? `"${matched.industry} / ${matched.role}"` : "none"
      }`
    );
    return matched;
  } catch (error) {
    console.warn("[cache] matcher failed; treating as no match:", error);
    return null;
  }
}

export async function saveCore(
  vertical: Vertical,
  industry: string,
  role: string
): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  try {
    const { industryNorm, roleNorm } = normalizePair(industry, role);
    const { data, error } = await db
      .from("mm_module_cores")
      .upsert(
        {
          industry,
          role,
          industry_norm: industryNorm,
          role_norm: roleNorm,
          core: stripPayoff(vertical),
          schema_version: SCHEMA_VERSION,
          use_count: 0,
        },
        { onConflict: "industry_norm,role_norm,schema_version" }
      )
      .select("id")
      .single();
    if (error) throw error;
    // A replaced core starts with a clean slate: detach old feedback so it
    // no longer gates (rows survive for review via module_id).
    await db.from("mm_feedback").update({ core_id: null }).eq("core_id", data.id);
    console.log(`[cache] saved core ${data.id} for "${industry} / ${role}"`);
    return data.id;
  } catch (error) {
    console.warn("[cache] core save failed:", error);
    return null;
  }
}

export async function bumpUseCount(id: string): Promise<void> {
  const db = supabase();
  if (!db) return;
  try {
    const { data } = await db
      .from("mm_module_cores")
      .select("use_count")
      .eq("id", id)
      .single();
    await db
      .from("mm_module_cores")
      .update({ use_count: (data?.use_count ?? 0) + 1 })
      .eq("id", id);
  } catch {
    // Telemetry only — never worth failing over.
  }
}
```

- [ ] **Step 4: Run tests + typecheck** — `npm test` → PASS; `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add lib/generation/cache.ts lib/generation/cache.test.ts
git commit -m "Add server-side core cache with Haiku pair matcher

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Wire the cache into `/api/generate`

**Files:**
- Modify: `app/api/generate/route.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–6.
- Produces: response shape gains `coreId: string | null`; `source` union gains `"cached"`. Consumed by Task 9's client changes.

- [ ] **Step 1: Add the payoff-only generation function** (below `generateWithModel`; same guardrail pattern):

```ts
async function generatePayoffWithModel(
  request: GenerationRequest,
  cached: CachedCore,
  signal: AbortSignal
): Promise<GenerationSuccess & { coreId: string }> {
  const client = new Anthropic({ maxRetries: 0 });
  const systemPrompt = buildPayoffSystemPrompt();
  let previousErrors: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[generate] payoff attempt ${attempt}/${MAX_ATTEMPTS} (core ${cached.id})`);
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: [
          { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          {
            role: "user",
            content: buildPayoffUserPrompt({ request, core: cached.core, previousErrors }),
          },
        ],
      },
      { signal }
    );

    const message = await stream.finalMessage();
    console.log(
      `[generate] payoff attempt ${attempt} done: stop_reason=${message.stop_reason}, usage=${JSON.stringify(message.usage)}`
    );
    if (message.stop_reason === "refusal") {
      throw new Error("The model declined to generate this payoff.");
    }
    if (message.stop_reason === "max_tokens") {
      throw new Error("Payoff generation ran out of output tokens; try again.");
    }

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    let candidate: unknown;
    try {
      candidate = JSON.parse(stripFences(text));
    } catch {
      previousErrors = ["Output was not valid JSON. Emit only the JSON object."];
      continue;
    }

    const parsed = GeneratedPayoffSchema.safeParse(candidate);
    if (!parsed.success) {
      previousErrors = parsed.error.issues
        .slice(0, 20)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      console.warn(`[generate] payoff attempt ${attempt} failed schema validation`);
      continue;
    }

    const vertical = assembleVertical(cached.core, parsed.data);
    const { errors, warnings } = validateVertical(vertical);
    if (errors.length > 0) {
      previousErrors = errors;
      console.warn(`[generate] payoff attempt ${attempt} failed semantic validation`);
      continue;
    }

    void bumpUseCount(cached.id);
    return { vertical, warnings, source: "cached", coreId: cached.id };
  }

  throw new Error(
    `Payoff generation failed validation after ${MAX_ATTEMPTS} attempts: ${previousErrors.join("; ")}`
  );
}
```

New imports: `assembleVertical` + `CachedCore` types from `@/lib/generation/core` / `@/lib/generation/cache`; `GeneratedPayoffSchema` from `@/lib/generation/schema`; `buildPayoffSystemPrompt`, `buildPayoffUserPrompt` from `@/lib/generation/prompt`; `lookupCoreExact`, `listCandidatePairs`, `matchPair`, `saveCore`, `bumpUseCount` from `@/lib/generation/cache`.

- [ ] **Step 2: Update the shared types**

```ts
interface GenerationSuccess {
  vertical: Vertical;
  warnings: string[];
  source: "model" | "mock" | "cached";
  coreId?: string | null;
}
```

- [ ] **Step 3: Rework the POST flow** — replace the current `useMock ? … : generateWithModel(…)` expression with:

```ts
  try {
    let result: GenerationSuccess;
    if (useMock) {
      result = { ...(await mockGenerate(parsed.data)), source: "mock", coreId: null };
    } else {
      const { targetIndustry, targetRole } = parsed.data;
      let cached = await lookupCoreExact(targetIndustry, targetRole);
      if (!cached) {
        const candidates = await listCandidatePairs();
        const match = await matchPair(targetIndustry, targetRole, candidates);
        if (match) cached = await lookupCoreExact(match.industry, match.role);
      }
      if (cached) {
        console.log(`[generate] cache hit (core ${cached.id}) — payoff-only run`);
        result = await generatePayoffWithModel(parsed.data, cached, req.signal);
      } else {
        console.log("[generate] cache miss — full generation");
        result = await generateWithModel(parsed.data, req.signal);
        result.coreId = await saveCore(result.vertical, targetIndustry, targetRole);
      }
    }
    return NextResponse.json(result);
  } catch (error) {
```

(The `catch` chain is unchanged.)

- [ ] **Step 4: Typecheck + tests** — `npx tsc --noEmit` → clean; `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "Serve cached cores with payoff-only regeneration in /api/generate

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: `/api/feedback` route

**Files:**
- Create: `app/api/feedback/route.ts`

**Interfaces:**
- Consumes: `FeedbackScene` (Task 5); tables from Task 1.
- Produces: `POST /api/feedback` accepting `{ moduleId, coreId?, userId?, scene, score, comment? }`, returns `{ ok: true }` (200) or `{ error }` (400/503). Consumed by Task 9's UI.

- [ ] **Step 1: Implement `app/api/feedback/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * POST /api/feedback — store learner feedback. Thumbs (score ±1) on lesson /
 * simulation / payoff scenes; a 1-5 rating (+ optional comment) for scene
 * "overall". Rows with a core_id gate the module-core cache (see
 * lib/feedback/scoring.ts).
 */

const FeedbackSchema = z
  .object({
    moduleId: z.string().min(1),
    coreId: z.string().uuid().nullish(),
    userId: z.string().uuid().nullish(),
    scene: z.enum(["lesson", "simulation", "payoff", "overall"]),
    score: z.number().int(),
    comment: z.string().max(2000).nullish(),
  })
  .refine(
    (f) =>
      f.scene === "overall"
        ? f.score >= 1 && f.score <= 5
        : f.score === 1 || f.score === -1,
    { message: "score out of range for scene" }
  );

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Storage not configured." }, { status: 503 });
  }

  const { error } = await createClient(url, key).from("mm_feedback").insert({
    module_id: parsed.data.moduleId,
    core_id: parsed.data.coreId ?? null,
    user_id: parsed.data.userId ?? null,
    scene: parsed.data.scene,
    score: parsed.data.score,
    comment: parsed.data.comment ?? null,
  });
  if (error) {
    console.warn("[feedback] insert failed:", error);
    return NextResponse.json({ error: "Could not save feedback." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → clean.

- [ ] **Step 3: Smoke-test validation with the dev server running**

Run: `curl -s -X POST localhost:3000/api/feedback -H 'content-type: application/json' -d '{"moduleId":"m1","scene":"lesson","score":2}'`
Expected: 400 with "score out of range for scene".
Run again with `"score":1` → `{"ok":true}` (or 503 if Supabase env unset — also correct).

- [ ] **Step 4: Commit**

```bash
git add app/api/feedback/route.ts
git commit -m "Add /api/feedback endpoint

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Client plumbing — coreId through store, storage, and Setup

**Files:**
- Modify: `lib/store.ts`, `lib/storage.ts`, `lib/storage-supabase.ts`, `components/scenes/Setup.tsx`

**Interfaces:**
- Consumes: `/api/generate` response `{ coreId, source: "cached" }` (Task 7).
- Produces (consumed by Task 10): `useFlowStore` gains `coreId: string | null`; `setVertical(vertical: Vertical, meta?: { coreId?: string | null })`; `SavedModule` gains `coreId?: string | null` and `source` gains `"cached"`.

- [ ] **Step 1: `lib/storage.ts`** — extend `SavedModule`:

```ts
export interface SavedModule {
  /** Matches vertical.id. */
  id: string;
  industry: string;
  role: string;
  productName: string;
  source: "model" | "mock" | "cached";
  /** Cache core this module was assembled from, for feedback attribution. */
  coreId?: string | null;
  createdAt: string;
  vertical: Vertical;
}
```

- [ ] **Step 2: `lib/storage-supabase.ts`** — carry the column: add `core_id` to the `listModules` select and map `coreId: row.core_id ?? null`; add `core_id: module.coreId ?? null` to the `saveModule` upsert object.

- [ ] **Step 3: `lib/store.ts`** — add state + meta parameter:

- In `FlowState`: `coreId: string | null;` and change the setter signature to `setVertical: (vertical: Vertical, meta?: { coreId?: string | null }) => void;`
- Initial state: `coreId: null,`
- In the `setVertical` implementation, also set `coreId: meta?.coreId ?? null`.
- In `restart()` (and any path that resets to the built-in vertical), reset `coreId: null`.
- If `hydrate()` restores a generated vertical from a `SavedModule`, pass `meta: { coreId: module.coreId ?? null }` — check how `registerVertical`/`getVertical` are used there and thread it through the same code path.

- [ ] **Step 4: `components/scenes/Setup.tsx`** — thread the response through:

- The `data` type in `generate()` gains `coreId?: string | null`.
- `storage.saveModule({ ..., source: data.source ?? "mock", coreId: data.coreId ?? null, ... })`
- `setVertical(data.vertical, { coreId: data.coreId ?? null })`
- `reopenModule`: `setVertical(m.vertical, { coreId: m.coreId ?? null })`
- In the saved-modules list JSX (the `savedModules.map(...)` block), surface the path on the card, e.g. where the source/product is rendered add: `{m.source === "cached" ? " · reused core" : ""}`. Match the surrounding markup's classes.

- [ ] **Step 5: Typecheck + tests** — `npx tsc --noEmit` → clean; `npm test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/store.ts lib/storage.ts lib/storage-supabase.ts components/scenes/Setup.tsx
git commit -m "Thread cache coreId through store, storage, and Setup

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Feedback UI — scene thumbs + completion rating

**Files:**
- Create: `components/FeedbackControls.tsx`
- Modify: `components/scenes/Lesson.tsx`, `components/scenes/Simulation.tsx`, `components/scenes/Payoff.tsx`

**Interfaces:**
- Consumes: `useFlowStore` (`vertical.id`, `coreId`, `user`), `POST /api/feedback` (Task 8).
- Produces: `<SceneThumbs scene="lesson" | "simulation" | "payoff" />` and `<CompletionFeedback />`.

- [ ] **Step 1: Implement `components/FeedbackControls.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useFlowStore } from "@/lib/store";

/**
 * Learner feedback. SceneThumbs = one-tap ±1 on a scene; CompletionFeedback =
 * 1-5 rating + optional comment on the payoff completion card. Rows attribute
 * to the module and (when generated from the cache path) its core, which
 * gates future cache reuse.
 */

type ThumbScene = "lesson" | "simulation" | "payoff";

async function postFeedback(body: {
  scene: ThumbScene | "overall";
  score: number;
  comment?: string;
  moduleId: string;
  coreId: string | null;
  userId: string | null;
}) {
  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Feedback is best-effort; never interrupt the flow.
  }
}

function useFeedbackMeta() {
  const vertical = useFlowStore((s) => s.vertical);
  const coreId = useFlowStore((s) => s.coreId);
  const user = useFlowStore((s) => s.user);
  return { moduleId: vertical.id, coreId, userId: user?.id ?? null };
}

export function SceneThumbs({ scene }: { scene: ThumbScene }) {
  const meta = useFeedbackMeta();
  const [sent, setSent] = useState<1 | -1 | null>(null);

  const send = (score: 1 | -1) => {
    if (sent) return;
    setSent(score);
    void postFeedback({ scene, score, ...meta });
  };

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {sent ? (
        <span>Thanks for the feedback</span>
      ) : (
        <>
          <span>Was this section useful?</span>
          <button
            type="button"
            aria-label="Thumbs up"
            onClick={() => send(1)}
            className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
          >
            👍
          </button>
          <button
            type="button"
            aria-label="Thumbs down"
            onClick={() => send(-1)}
            className="rounded px-1.5 py-0.5 hover:bg-accent hover:text-accent-foreground"
          >
            👎
          </button>
        </>
      )}
    </div>
  );
}

export function CompletionFeedback() {
  const meta = useFeedbackMeta();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!rating || done) return;
    setDone(true);
    void postFeedback({
      scene: "overall",
      score: rating,
      comment: comment.trim() || undefined,
      ...meta,
    });
  };

  if (done) {
    return (
      <p className="text-xs text-muted-foreground">
        Thanks — your feedback improves future modules.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Rate this module:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={
              n <= rating ? "text-base" : "text-base opacity-30 hover:opacity-70"
            }
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was off? (optional)"
            rows={2}
            className="rounded border border-border bg-transparent p-2 text-xs"
          />
          <button
            type="button"
            onClick={submit}
            className="self-start rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground"
          >
            Send feedback
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount the controls**

- `Lesson.tsx`: add `<SceneThumbs scene="lesson" />` near the scene's footer/CTA area (read the file, place it after the card list, before or beside the advance CTA; match surrounding spacing).
- `Simulation.tsx`: `<SceneThumbs scene="simulation" />` in the footer area near the launch control.
- `Payoff.tsx`: `<SceneThumbs scene="payoff" />` near the toolkit/export block, and `<CompletionFeedback />` inside the completion card (the block rendering `payoff.completion.title` / `.body`, ~line 516), above the restart button.

- [ ] **Step 3: Typecheck + lint** — `npx tsc --noEmit` and `npm run lint` → clean.

- [ ] **Step 4: Manual verification in mock mode**

1. Add `METHOD_GENERATION_MOCK=1` to `.env.local`, restart `npm run dev`.
2. Generate a module (instant, free), walk Lesson → Simulation → Payoff, click thumbs on each scene and submit a rating + comment.
3. Verify rows: Supabase Dashboard → Table editor → `mm_feedback` — expect one row per interaction, `core_id` null (mock path), `scene`/`score` correct.
4. Remove `METHOD_GENERATION_MOCK=1` afterwards.

- [ ] **Step 5: Commit**

```bash
git add components/FeedbackControls.tsx components/scenes/Lesson.tsx components/scenes/Simulation.tsx components/scenes/Payoff.tsx
git commit -m "Add scene thumbs and completion rating feedback UI

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: End-to-end verification (real model, user-approved spend)

**Files:** none (verification only)

- [ ] **Step 1: Confirm schema is applied** — user has run Task 1's SQL in Supabase.

- [ ] **Step 2: Full-generation seed (~$1.60, user approves first)** — with mock mode OFF, generate e.g. "Fintech / Account Executives". Watch dev terminal for `[generate] cache miss — full generation` then `[cache] saved core <id>`. Verify the row in `mm_module_cores`.

- [ ] **Step 3: Exact-hit rerun (~$0.20)** — generate the same pair with a different product name. Expect `[generate] cache hit … payoff-only run`, completion in well under a minute vs ~6, and the payoff artifacts selling the NEW product while lesson/simulation match the cached core.

- [ ] **Step 4: Fuzzy-hit rerun (~$0.20)** — generate "Financial Services / AEs". Expect `[cache] matcher: … -> "Fintech / Account Executives"` then the payoff-only run. If the matcher says none, that's within its bias-to-fresh mandate — note it, don't chase it.

- [ ] **Step 5: Gate check (no spend)** — in Supabase SQL editor, insert two blocking rows against the core:

```sql
insert into public.mm_feedback (core_id, module_id, scene, score)
select id, 'gate-test', 'lesson', -1 from public.mm_module_cores limit 1;
insert into public.mm_feedback (core_id, module_id, scene, score)
select id, 'gate-test', 'simulation', -1 from public.mm_module_cores limit 1;
```

Re-generate the exact pair: expect `[cache] core <id> is feedback-blocked; regenerating` and a full generation that replaces the core and detaches the gate-test rows (`core_id` becomes null). Delete the test rows afterwards.

- [ ] **Step 6: Report results to the user** with actual costs observed from the console.

---

## Self-review notes

- Spec coverage: exact lookup ✓ (T6/T7), Haiku matcher ✓ (T6), payoff-only regen with zod retry ✓ (T7), core write-back ✓ (T7), never-block posture ✓ (T6/T8 try/catch), source surfaced ✓ (T9), schema SQL ✓ (T1), feedback both-UX ✓ (T10), store+gate ✓ (T5/T6), gating excludes payoff thumbs ✓ (T5).
- Deviation from spec noted: "Setup scene surfaces which path ran" is implemented as a badge on the saved-module card (the success path navigates away immediately, so a transient toast would be unseen).
- Type consistency: `setVertical(vertical, meta?)` (T9) matches T10's store reads; `GenerationSuccess.coreId` (T7) matches T9's `data.coreId`.
