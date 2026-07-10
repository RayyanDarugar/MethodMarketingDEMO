import { describe, expect, it } from "vitest";
import { activeVertical } from "@/lib/content";
import {
  GeneratedFoundationSchema,
  GeneratedPayoffSchema,
  GeneratedSimulationSchema,
  GeneratedVerticalSchema,
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
