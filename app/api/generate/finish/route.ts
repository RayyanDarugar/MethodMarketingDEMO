import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { activeVertical } from "@/lib/content";
import {
  buildPayoffSystemPrompt,
  buildPayoffUserPrompt,
} from "@/lib/generation/prompt";
import {
  GeneratedFoundationSchema,
  GeneratedPayoffSchema,
  GeneratedSimulationSchema,
  GeneratedVerticalSchema,
  GenerationRequestSchema,
  toVertical,
  validateVertical,
} from "@/lib/generation/schema";
import { runSection } from "@/lib/generation/run-section";
import { saveCore } from "@/lib/generation/cache";

/**
 * POST /api/generate/finish — final leg of the chunked seed flow: generate
 * the payoff for the requester's product, assemble foundation + simulation +
 * payoff into a full module, run the assembled safety-net validation, save
 * the core to the cache, and return the module.
 *
 * Cross-section validation failures return 422 with the section to re-run
 * (they should be rare — each section already validated its own rules).
 */

export const maxDuration = 300;

const BodySchema = z.object({
  request: GenerationRequestSchema,
  foundation: GeneratedFoundationSchema,
  simulation: GeneratedSimulationSchema,
});

/** Map an assembled-validation error message to the section that owns it. */
function sectionForError(message: string): 1 | 2 {
  return /frequencyCap|forecast|byCap|band|priority|threshold|outcome/i.test(
    message
  )
    ? 2
    : 1;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const { request, foundation, simulation } = parsed.data;

  try {
    const payoff = await runSection(
      {
        label: "payoff",
        systemPrompt: buildPayoffSystemPrompt(),
        userPrompt: (previousErrors) =>
          buildPayoffUserPrompt({
            request,
            core: {
              industry: foundation.industry,
              role: foundation.role,
              lesson: foundation.lesson,
              simulation: { productName: simulation.simulation.productName },
            },
            previousErrors,
          }),
        schema: GeneratedPayoffSchema,
      },
      req.signal
    );

    const wire = GeneratedVerticalSchema.parse({
      ...foundation,
      ...simulation,
      payoff,
    });
    const vertical = toVertical(wire, activeVertical.config);
    const { errors, warnings } = validateVertical(vertical);
    if (errors.length > 0) {
      const section = sectionForError(errors[0]);
      console.warn(
        `[generate] assembled validation failed (section ${section}):\n  ${errors.join("\n  ")}`
      );
      return NextResponse.json(
        {
          error: "Assembled module failed validation.",
          section,
          issues: errors,
        },
        { status: 422 }
      );
    }

    const coreId = await saveCore(
      vertical,
      request.targetIndustry,
      request.targetRole
    );
    return NextResponse.json({
      vertical,
      warnings,
      source: "model",
      coreId,
    });
  } catch (error) {
    if (error instanceof Anthropic.APIUserAbortError) {
      console.warn("[generate] finish aborted: client disconnected");
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
    const message = error instanceof Error ? error.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
