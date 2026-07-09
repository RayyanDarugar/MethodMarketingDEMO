import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
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

/** Unwrap a ```json fenced block so a fenced reply doesn't burn a retry. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

async function generateWithModel(
  request: GenerationRequest,
  signal: AbortSignal
): Promise<GenerationSuccess> {
  // maxRetries: 0 — the SDK default (2) silently re-sends the whole request
  // on connection errors/timeouts; each invisible retry is a full billed
  // generation. Fail loudly instead.
  const client = new Anthropic({ maxRetries: 0 });
  const systemPrompt = buildSystemPrompt();
  let previousErrors: string[] = [];

  // GeneratedVerticalSchema exceeds the structured-outputs grammar-size limit
  // (the API rejects it with a 400), so the output shape is enforced by the
  // gold exemplar in the system prompt plus zod validation with retry.

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[generate] attempt ${attempt}/${MAX_ATTEMPTS} starting`);
    const stream = client.messages.stream(
      {
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
        messages: [
          {
            role: "user",
            content: buildUserPrompt(request, { previousErrors }),
          },
        ],
      },
      // Abort the generation if the browser disconnects (refresh, re-click,
      // closed tab) — otherwise orphaned runs keep billing invisibly.
      { signal }
    );

    const message = await stream.finalMessage();
    console.log(
      `[generate] attempt ${attempt} done: stop_reason=${message.stop_reason}, usage=${JSON.stringify(message.usage)}`
    );

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
      candidate = JSON.parse(stripFences(text));
    } catch {
      previousErrors = ["Output was not valid JSON. Emit only the JSON object."];
      console.warn(`[generate] attempt ${attempt} output was not valid JSON`);
      continue;
    }

    const parsed = GeneratedVerticalSchema.safeParse(candidate);
    if (!parsed.success) {
      previousErrors = parsed.error.issues
        .slice(0, 20)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      console.warn(
        `[generate] attempt ${attempt} failed schema validation:\n  ${previousErrors.join("\n  ")}`
      );
      continue;
    }

    const vertical = toVertical(parsed.data, activeVertical.config);
    const { errors, warnings } = validateVertical(vertical);
    if (errors.length > 0) {
      previousErrors = errors;
      console.warn(
        `[generate] attempt ${attempt} failed semantic validation:\n  ${errors.join("\n  ")}`
      );
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
      : await generateWithModel(parsed.data, req.signal);
    return NextResponse.json(result);
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
