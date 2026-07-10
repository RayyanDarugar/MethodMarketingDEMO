import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  buildFoundationSystemPrompt,
  buildFoundationUserPrompt,
  buildSimulationSystemPrompt,
  buildSimulationUserPrompt,
} from "@/lib/generation/prompt";
import {
  GeneratedFoundationSchema,
  GeneratedSimulationSchema,
  GenerationRequestSchema,
  validateFoundationWire,
  validateSimulationWire,
} from "@/lib/generation/schema";
import { runSection } from "@/lib/generation/run-section";

/**
 * POST /api/generate/section — generate one section of a module (chunked
 * seed flow). Section 1 = foundation, section 2 = simulation (requires the
 * foundation as context). Each call is a single short model run with one
 * validation-guided retry, so it fits serverless time limits. The client
 * carries sections between calls; the server is stateless.
 */

export const maxDuration = 300;

const BodySchema = z
  .object({
    section: z.union([z.literal(1), z.literal(2)]),
    request: GenerationRequestSchema,
    foundation: GeneratedFoundationSchema.optional(),
  })
  .refine((b) => b.section === 1 || b.foundation !== undefined, {
    message: "section 2 requires the foundation",
  });

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
  const { section, request, foundation } = parsed.data;

  try {
    if (section === 1) {
      const result = await runSection(
        {
          label: "foundation",
          systemPrompt: buildFoundationSystemPrompt(),
          userPrompt: (previousErrors) =>
            buildFoundationUserPrompt({ request, previousErrors }),
          schema: GeneratedFoundationSchema,
          semantic: validateFoundationWire,
        },
        req.signal
      );
      return NextResponse.json({ foundation: result });
    }

    const result = await runSection(
      {
        label: "simulation",
        systemPrompt: buildSimulationSystemPrompt(),
        userPrompt: (previousErrors) =>
          buildSimulationUserPrompt({
            request,
            foundation: foundation!,
            previousErrors,
          }),
        schema: GeneratedSimulationSchema,
        semantic: validateSimulationWire,
      },
      req.signal
    );
    return NextResponse.json({ simulation: result });
  } catch (error) {
    if (error instanceof Anthropic.APIUserAbortError) {
      console.warn("[generate] section aborted: client disconnected");
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
