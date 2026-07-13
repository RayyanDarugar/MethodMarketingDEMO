import type { Vertical } from "@/lib/content";

/**
 * Core = a Vertical minus its product-personalized payoff. Cores are safe to
 * share across users/products; bump SCHEMA_VERSION when the wire format
 * changes so stale cores stop matching.
 *
 * v2 (2026-07-10): Tier B scenario engine — simulation became a beat-based
 * ScenarioSimulation; v1 cores (frequencyCap/forecast shape) are retired.
 */
export const SCHEMA_VERSION = 2;

export type VerticalCore = Omit<Vertical, "payoff">;

export function normalizePair(industry: string, role: string) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return { industryNorm: norm(industry), roleNorm: norm(role) };
}

export function stripPayoff(vertical: Vertical): VerticalCore {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { payoff: _payoff, ...core } = vertical;
  return core;
}

export function assembleVertical(
  core: VerticalCore,
  payoff: Vertical["payoff"]
): Vertical {
  return {
    ...core,
    payoff,
    id: `${core.id}-r${Date.now().toString(36)}`,
  };
}
