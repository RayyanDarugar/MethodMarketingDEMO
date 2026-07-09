import { describe, expect, it } from "vitest";
import {
  gatingScore,
  isCoreBlocked,
  type FeedbackRow,
} from "@/lib/feedback/scoring";

describe("gatingScore", () => {
  it("sums scene thumbs, ignores payoff, maps overall ratings", () => {
    const rows: FeedbackRow[] = [
      { scene: "lesson", score: 1 }, // +1
      { scene: "simulation", score: -1 }, // -1
      { scene: "payoff", score: -1 }, // ignored (product-specific)
      { scene: "overall", score: 5 }, // +1 (>=4)
      { scene: "overall", score: 2 }, // -1 (<=2)
      { scene: "overall", score: 3 }, // 0 (neutral)
    ];
    expect(gatingScore(rows)).toBe(0);
  });
});

describe("isCoreBlocked", () => {
  it("blocks at -2, not at -1", () => {
    const down = (scene: "lesson" | "simulation"): FeedbackRow => ({
      scene,
      score: -1,
    });
    expect(isCoreBlocked([down("lesson")])).toBe(false);
    expect(isCoreBlocked([down("lesson"), down("simulation")])).toBe(true);
  });
});
