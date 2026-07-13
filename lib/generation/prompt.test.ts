import { describe, expect, it } from "vitest";
import { activeVertical } from "@/lib/content";
import { stripPayoff } from "@/lib/generation/core";
import {
  GeneratedFoundationSchema,
  GeneratedSimulationSchema,
} from "@/lib/generation/schema";
import {
  buildFoundationSystemPrompt,
  buildFoundationUserPrompt,
  buildPayoffSystemPrompt,
  buildPayoffUserPrompt,
  buildSimulationSystemPrompt,
  buildSimulationUserPrompt,
  buildSystemPrompt,
  toWireFormat,
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

describe("section prompts", () => {
  const wire = toWireFormat(activeVertical);
  const foundation = GeneratedFoundationSchema.parse(wire);
  const simulation = GeneratedSimulationSchema.parse(wire);

  it("foundation system embeds only the foundation exemplar", () => {
    const prompt = buildFoundationSystemPrompt();
    expect(prompt).toContain(wire.lesson.title);
    expect(prompt).not.toContain("emailSequence"); // payoff artifact kinds excluded
    expect(prompt).not.toContain('"byCap"'); // simulation numbers excluded
  });

  it("foundation user prompt carries industry/role but NOT the product (cores stay product-agnostic)", () => {
    const prompt = buildFoundationUserPrompt({ request });
    expect(prompt).toContain("Fintech");
    expect(prompt).toContain("Account Executives");
    expect(prompt).not.toContain("Agent Dynamo");
  });

  it("simulation system embeds scenario mechanics, archetypes, and the exemplar", () => {
    const prompt = buildSimulationSystemPrompt();
    expect(prompt).toContain('"byValue"'); // numeric beat rows in the exemplar
    expect(prompt).toContain(wire.simulation.productName);
    for (const archetype of ["opsDashboard", "dealDesk", "studioBoard"]) {
      expect(prompt).toContain(archetype);
    }
    expect(prompt).toContain("decisive: true");
    // Research-brief texture that grounds the two new archetypes
    expect(prompt).toContain("4.2x");
    expect(prompt).toContain("change orders");
  });

  it("simulation user prompt embeds the foundation as context and threads errors", () => {
    const prompt = buildSimulationUserPrompt({
      request,
      foundation,
      previousErrors: ["forecast.byCap is missing an entry for cap=3."],
    });
    expect(prompt).toContain(foundation.lesson.title);
    expect(prompt).toContain("cap=3");
    expect(prompt).not.toContain("Agent Dynamo");
  });

  it("payoff user prompt accepts a wire-built context", () => {
    const prompt = buildPayoffUserPrompt({
      request,
      core: {
        industry: foundation.industry,
        role: foundation.role,
        lesson: foundation.lesson,
        simulation: { productName: simulation.simulation.productName },
      },
    });
    expect(prompt).toContain("Agent Dynamo");
    expect(prompt).toContain(simulation.simulation.productName);
  });
});
