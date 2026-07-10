import { describe, expect, it } from "vitest";
import { adTechScenario, adTechScenarioBands } from "@/lib/content";
import {
  applySelections,
  decisiveMeter,
  endingFor,
  validateScenario,
} from "@/lib/scenario/engine";
import type { BeatSelection } from "@/lib/scenario/types";

const pick = (
  cap: number,
  choices: Record<string, number>
): BeatSelection[] => [
  { beatId: "io-closed", choiceIndex: choices["io-closed"] ?? 0 },
  { beatId: "pacing-warning", choiceIndex: choices["pacing-warning"] ?? 0 },
  { beatId: "frequency-cap", value: cap },
  { beatId: "weekend-push", choiceIndex: choices["weekend-push"] ?? 0 },
  { beatId: "priority-call", choiceIndex: choices["priority-call"] ?? 0 },
  { beatId: "makegood-rumor", choiceIndex: choices["makegood-rumor"] ?? 0 },
];

function endingOf(selections: BeatSelection[]) {
  const finals = applySelections(adTechScenario, selections);
  return endingFor(
    finals[decisiveMeter(adTechScenario).id],
    adTechScenarioBands
  );
}

describe("adTechScenario exemplar", () => {
  it("passes full scenario validation", () => {
    expect(validateScenario(adTechScenario, adTechScenarioBands)).toEqual([]);
  });

  it("sane choices with a 2-4 cap land 'balanced'", () => {
    expect(endingOf(pick(3, {}))).toBe("balanced");
    expect(endingOf(pick(2, {}))).toBe("balanced");
    expect(endingOf(pick(4, {}))).toBe("balanced");
  });

  it("a tight cap starves delivery → 'low'", () => {
    expect(endingOf(pick(1, {}))).toBe("low");
  });

  it("a loose cap or splashy choices burn frequency → 'high'", () => {
    expect(endingOf(pick(7, {}))).toBe("high");
    // Cap 4 but saying yes to every escalation also tips over
    expect(
      endingOf(
        pick(4, {
          "io-closed": 1,
          "pacing-warning": 2,
          "weekend-push": 1,
          "priority-call": 1,
        })
      )
    ).toBe("high");
  });
});
