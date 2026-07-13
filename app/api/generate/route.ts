import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Vertical } from "@/lib/content";
import { mockGenerate } from "@/lib/generation/mock";
import {
  buildPayoffSystemPrompt,
  buildPayoffUserPrompt,
} from "@/lib/generation/prompt";
import {
  GeneratedPayoffSchema,
  GenerationRequestSchema,
  validateVertical,
  type GenerationRequest,
} from "@/lib/generation/schema";
import { assembleVertical } from "@/lib/generation/core";
import {
  bumpUseCount,
  listCandidatePairs,
  lookupCoreExact,
  matchPair,
  type CachedCore,
} from "@/lib/generation/cache";
import { runSection } from "@/lib/generation/run-section";

/**
 * POST /api/generate — entry point for module generation.
 *
 * Fast paths handled inline (they fit serverless time limits):
 * - mock (no ANTHROPIC_API_KEY or METHOD_GENERATION_MOCK=1)
 * - cache hit: reuse the industry/role core, regenerate only the payoff
 *   for the requester's product (~85s)
 *
 * Cache miss returns `{ seed: true }` WITHOUT generating: a full seed takes
 * 6–12 minutes, which exceeds serverless caps, so the client orchestrates it
 * as three short calls (/api/generate/section ×2, then /api/generate/finish).
 */

export const maxDuration = 300;

interface GenerationSuccess {
  vertical: Vertical;
  warnings: string[];
  source: "model" | "mock" | "cached";
  coreId?: string | null;
}

/** Cache-hit path: cached core + fresh payoff for this product. */
async function generateFromCache(
  request: GenerationRequest,
  cached: CachedCore,
  signal: AbortSignal
): Promise<GenerationSuccess> {
  const payoff = await runSection(
    {
      label: "payoff",
      systemPrompt: buildPayoffSystemPrompt(),
      userPrompt: (previousErrors) =>
        buildPayoffUserPrompt({ request, core: cached.core, previousErrors }),
      schema: GeneratedPayoffSchema,
      // The core was validated when saved, so any assembled error is the
      // payoff's fault and retries the payoff alone.
      semantic: (p) => validateVertical(assembleVertical(cached.core, p)).errors,
    },
    signal
  );

  const vertical = assembleVertical(cached.core, payoff);
  const { warnings } = validateVertical(vertical);
  void bumpUseCount(cached.id);
  return { vertical, warnings, source: "cached", coreId: cached.id };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = GenerationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const useMock =
    !process.env.ANTHROPIC_API_KEY ||
    process.env.METHOD_GENERATION_MOCK === "1";

  try {
    if (useMock) {
      const result: GenerationSuccess = {
        ...(await mockGenerate(parsed.data)),
        source: "mock",
        coreId: null,
      };
      return NextResponse.json(result);
    }

    const { targetIndustry, targetRole } = parsed.data;
    let cached = await lookupCoreExact(targetIndustry, targetRole);
    if (!cached) {
      const candidates = await listCandidatePairs();
      const match = await matchPair(targetIndustry, targetRole, candidates);
      if (match) cached = await lookupCoreExact(match.industry, match.role);
    }
    if (cached) {
      console.log(`[generate] cache hit (core ${cached.id}) — payoff-only run`);
      const result = await generateFromCache(parsed.data, cached, req.signal);
      return NextResponse.json(result);
    }

    console.log("[generate] cache miss — client will run the section flow");
    return NextResponse.json({ seed: true });
  } catch (error) {
    if (error instanceof Anthropic.APIUserAbortError) {
      // Client disconnected; the model call was cancelled. Nobody is
      // listening for this response.
      console.warn("[generate] aborted: client disconnected");
      return NextResponse.json({ error: "Client disconnected." }, { status: 499 });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Anthropic API key is invalid. Check ANTHROPIC_API_KEY." },
        { status: 502 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited by the model API — try again shortly." },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Model API error (${error.status}).` },
        { status: 502 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
