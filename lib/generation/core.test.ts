import { describe, expect, it } from "vitest";
import { activeVertical } from "@/lib/content";
import {
  assembleVertical,
  normalizePair,
  stripPayoff,
} from "@/lib/generation/core";

describe("normalizePair", () => {
  it("lowercases, trims, and collapses inner whitespace", () => {
    expect(normalizePair("  FinTech ", "Account  Executives")).toEqual({
      industryNorm: "fintech",
      roleNorm: "account executives",
    });
  });
});

describe("stripPayoff / assembleVertical", () => {
  it("round-trips a vertical, minting a fresh id", () => {
    const core = stripPayoff(activeVertical);
    expect("payoff" in core).toBe(false);
    const rebuilt = assembleVertical(core, activeVertical.payoff);
    expect(rebuilt.payoff).toEqual(activeVertical.payoff);
    expect(rebuilt.lesson).toEqual(activeVertical.lesson);
    expect(rebuilt.id).toMatch(new RegExp(`^${activeVertical.id}-r[a-z0-9]+$`));
  });
});
