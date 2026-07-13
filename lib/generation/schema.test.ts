import { describe, expect, it } from "vitest";
import { activeVertical } from "@/lib/content";
import {
  GeneratedFoundationSchema,
  GeneratedPayoffSchema,
  GeneratedSimulationSchema,
  GeneratedVerticalSchema,
  validateFoundationWire,
  validateSimulationWire,
} from "@/lib/generation/schema";
import { toWireFormat } from "@/lib/generation/prompt";

describe("GeneratedPayoffSchema", () => {
  it("accepts the exemplar's payoff", () => {
    const parsed = GeneratedPayoffSchema.safeParse(activeVertical.payoff);
    expect(parsed.success).toBe(true);
  });

  it("rejects a payoff missing artifacts", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { toolkit: _t, ...broken } = activeVertical.payoff;
    expect(GeneratedPayoffSchema.safeParse(broken).success).toBe(false);
  });
});

describe("section schemas", () => {
  const wire = toWireFormat(activeVertical);

  it("accept the exemplar's wire slices", () => {
    expect(GeneratedFoundationSchema.safeParse(wire).success).toBe(true);
    expect(GeneratedSimulationSchema.safeParse(wire).success).toBe(true);
  });

  it("reject slices missing their fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { lesson: _l, ...noLesson } = wire;
    expect(GeneratedFoundationSchema.safeParse(noLesson).success).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { decision: _d, ...noDecision } = wire;
    expect(GeneratedSimulationSchema.safeParse(noDecision).success).toBe(false);
  });

  it("tile the full schema exactly: foundation + simulation + payoff parses as a full vertical", () => {
    const foundation = GeneratedFoundationSchema.parse(wire);
    const simulation = GeneratedSimulationSchema.parse(wire);
    const merged = { ...foundation, ...simulation, payoff: wire.payoff };
    expect(GeneratedVerticalSchema.safeParse(merged).success).toBe(true);
  });
});

describe("validateFoundationWire", () => {
  const foundation = GeneratedFoundationSchema.parse(toWireFormat(activeVertical));

  it("passes the exemplar", () => {
    expect(validateFoundationWire(foundation)).toEqual([]);
  });

  it("flags a missing terms card", () => {
    const broken = {
      ...foundation,
      lesson: {
        ...foundation.lesson,
        cards: foundation.lesson.cards.filter((c) => c.kind !== "terms"),
      },
    };
    expect(validateFoundationWire(broken).join(" ")).toContain("terms");
  });

  it("flags a quiz question without exactly one correct option", () => {
    const broken = {
      ...foundation,
      briefing: {
        ...foundation.briefing,
        quiz: foundation.briefing.quiz.map((q) => ({
          ...q,
          options: q.options.map((o) => ({ ...o, correct: true })),
        })),
      },
    };
    expect(validateFoundationWire(broken).join(" ")).toContain("correct");
  });
});

describe("validateSimulationWire", () => {
  const sim = GeneratedSimulationSchema.parse(toWireFormat(activeVertical));

  it("passes the exemplar scenario", () => {
    expect(validateSimulationWire(sim)).toEqual([]);
  });

  it("delegates scenario rules to the engine (byValue gap)", () => {
    const broken = structuredClone(sim);
    const numeric = broken.simulation.beats.find((b) => b.kind === "numeric");
    if (numeric?.kind === "numeric") numeric.byValue = numeric.byValue.slice(1);
    expect(validateSimulationWire(broken).join(" ")).toContain("byValue");
  });

  it("flags a missing balanced band", () => {
    const broken = {
      ...sim,
      decision: {
        bands: sim.decision.bands.map((b) => ({
          ...b,
          outcome: "low" as const,
        })),
      },
    };
    expect(validateSimulationWire(broken).join(" ")).toContain("balanced");
  });
});
