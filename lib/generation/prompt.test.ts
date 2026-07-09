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
