import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

/**
 * The generate → parse → schema → semantic → retry loop shared by every
 * generation section (foundation, simulation, payoff). One section is one
 * short model call (a few minutes), so each request fits inside serverless
 * function time limits; a validation failure retries only this section.
 */

const MODEL = process.env.GENERATION_MODEL ?? "claude-opus-4-8";
const MAX_ATTEMPTS = 2;

export interface SectionSpec<T> {
  /** For logs: "foundation" | "simulation" | "payoff". */
  label: string;
  systemPrompt: string;
  userPrompt: (previousErrors: string[]) => string;
  schema: z.ZodType<T>;
  /** Section-local rules beyond the schema; return error strings. */
  semantic?: (value: T) => string[];
}

/** Unwrap a ```json fenced block so a fenced reply doesn't burn a retry. */
export function stripFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

export async function runSection<T>(
  spec: SectionSpec<T>,
  signal: AbortSignal
): Promise<T> {
  // maxRetries: 0 — the SDK default silently re-sends the whole request on
  // connection errors/timeouts; each invisible retry is a billed generation.
  const client = new Anthropic({ maxRetries: 0 });
  let previousErrors: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(
      `[generate] ${spec.label} attempt ${attempt}/${MAX_ATTEMPTS} starting`
    );
    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: 32000,
        thinking: { type: "adaptive" },
        // Section system prompts embed their exemplar slice; cache so the
        // validation retry reuses the prefix.
        system: [
          {
            type: "text",
            text: spec.systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: spec.userPrompt(previousErrors) }],
      },
      // Abort if the browser disconnects — orphaned runs bill invisibly.
      { signal }
    );

    const message = await stream.finalMessage();
    console.log(
      `[generate] ${spec.label} attempt ${attempt} done: stop_reason=${message.stop_reason}, usage=${JSON.stringify(message.usage)}`
    );
    if (message.stop_reason === "refusal") {
      throw new Error(`The model declined to generate the ${spec.label} section.`);
    }
    if (message.stop_reason === "max_tokens") {
      throw new Error(
        `${spec.label} generation ran out of output tokens; try again.`
      );
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
      console.warn(
        `[generate] ${spec.label} attempt ${attempt} output was not valid JSON`
      );
      continue;
    }

    const parsed = spec.schema.safeParse(candidate);
    if (!parsed.success) {
      previousErrors = parsed.error.issues
        .slice(0, 20)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      console.warn(
        `[generate] ${spec.label} attempt ${attempt} failed schema validation:\n  ${previousErrors.join("\n  ")}`
      );
      continue;
    }

    const semanticErrors = spec.semantic?.(parsed.data) ?? [];
    if (semanticErrors.length > 0) {
      previousErrors = semanticErrors;
      console.warn(
        `[generate] ${spec.label} attempt ${attempt} failed semantic validation:\n  ${semanticErrors.join("\n  ")}`
      );
      continue;
    }

    return parsed.data;
  }

  throw new Error(
    `${spec.label} generation failed validation after ${MAX_ATTEMPTS} attempts: ${previousErrors.join("; ")}`
  );
}
