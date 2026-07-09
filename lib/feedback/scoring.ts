/**
 * Cache-gating signal. Thumbs on core scenes count ±1; the completion
 * rating maps 4-5 → +1, 1-2 → -1, 3 → 0. Payoff thumbs never gate a core —
 * the payoff is product-specific, not the core's fault.
 */

export type FeedbackScene = "lesson" | "simulation" | "payoff" | "overall";

export interface FeedbackRow {
  scene: FeedbackScene;
  score: number;
}

export const BLOCK_THRESHOLD = -2;

export function gatingScore(rows: FeedbackRow[]): number {
  let sum = 0;
  for (const row of rows) {
    if (row.scene === "payoff") continue;
    if (row.scene === "overall") {
      sum += row.score >= 4 ? 1 : row.score <= 2 ? -1 : 0;
    } else {
      sum += Math.sign(row.score);
    }
  }
  return sum;
}

export function isCoreBlocked(rows: FeedbackRow[]): boolean {
  return gatingScore(rows) <= BLOCK_THRESHOLD;
}
