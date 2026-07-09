import { describe, expect, it } from "vitest";
import { activeVertical } from "@/lib/content";
import { GeneratedPayoffSchema } from "@/lib/generation/schema";

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
