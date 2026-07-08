import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { activeVertical, type Vertical } from "@/lib/content";
import { mockGenerate } from "@/lib/generation/mock";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/generation/prompt";
import {
  GeneratedVerticalSchema,
  GenerationRequestSchema,
  toVertical,
  validateVertical,
  type GenerationRequest,
} from "@/lib/generation/schema";

/**
 * POST /api/generate — generate a learning module for a target industry/role,
 * personalized to the requester's product and calibration profile.
 *
 * Without an ANTHROPIC_API_KEY (or with METHOD_GENERATION_MOCK=1) the route
 * serves a mock module so the flow stays demoable; with a key it runs a real
 * structured-output generation with one validation-guided retry.
 */

// Generation is a single long model call; allow it to run (Vercel Pro caps
// apply — hobby plans clamp this lower).
export const maxDuration = 300;

const MODEL = process.env.GENERATION_MODEL ?? "claude-opus-4-8";
const MAX_ATTEMPTS = 2;

interface GenerationSuccess {
  vertical: Vertical;
  warnings: string[];
  source: "model" | "mock";
}

async function generateWithModel(
  request: GenerationRequest
): Promise<GenerationSuccess> {
  const client = new Anthropic();
  const systemPrompt = buildSystemPrompt();
  let previousErrors: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      // The system prompt embeds the large gold exemplar; cache it so the
      // validation retry (and subsequent generations) reuse the prefix.
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      output_config: {
        format: zodOutputFormat(GeneratedVerticalSchema),
      },
      messages: [
        {
          role: "user",
          content: buildUserPrompt(request, { previousErrors }),
        },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      throw new Error("The model declined to generate this module.");
    }
    if (message.stop_reason === "max_tokens") {
      throw new Error("Generation ran out of output tokens; try again.");
    }

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    let candidate: unknown;
    try {
      candidate = JSON.parse(text);
    } catch {
      previousErrors = ["Output was not valid JSON. Emit only the JSON object."];
      continue;
    }

    const parsed = GeneratedVerticalSchema.safeParse(candidate);
    if (!parsed.success) {
      previousErrors = parsed.error.issues
        .slice(0, 20)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      continue;
    }

    const vertical = toVertical(parsed.data, activeVertical.config);
    const { errors, warnings } = validateVertical(vertical);
    if (errors.length > 0) {
      previousErrors = errors;
      continue;
    }

    return { vertical, warnings, source: "model" };
  }

  throw new Error(
    `Generation failed validation after ${MAX_ATTEMPTS} attempts: ${previousErrors.join("; ")}`
  );
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
    const result: GenerationSuccess = useMock
      ? { ...(await mockGenerate(parsed.data)), source: "mock" }
      : await generateWithModel(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
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
