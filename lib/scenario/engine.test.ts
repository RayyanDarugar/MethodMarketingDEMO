import { describe, expect, it } from "vitest";
import {
  applySelections,
  decisiveMeter,
  decisiveRange,
  endingFor,
  validateScenario,
} from "@/lib/scenario/engine";
import type {
  DecisionBand,
  ScenarioSimulation,
} from "@/lib/scenario/types";

/** Minimal valid fixture: 3 meters, 5 beats (1 numeric), hand-checkable math. */
function fixture(): ScenarioSimulation {
  const msg = (
    id: string,
    deltas: [number, number][] // per choice: [delivery delta, trust delta]
  ) => ({
    kind: "message" as const,
    id,
    channel: "email" as const,
    from: { name: "Sam", role: "AE" },
    body: `Body of ${id}`,
    choices: deltas.map(([d, t], i) => ({
      label: `Choice ${i}`,
      effects: [
        { meter: "delivery", delta: d },
        { meter: "trust", delta: t },
      ],
      consequence: "…",
    })),
  });

  return {
    archetype: "opsDashboard",
    productName: "TestServe",
    environmentLabel: "Test env",
    header: [{ label: "Budget", value: "$10k" }],
    meters: [
      {
        id: "delivery",
        label: "Delivery",
        unit: "%",
        start: 50,
        min: 0,
        max: 100,
        goodDirection: "up",
        decisive: true,
      },
      {
        id: "reach",
        label: "Reach",
        unit: "%",
        start: 90,
        min: 0,
        max: 100,
        goodDirection: "up",
      },
      {
        id: "trust",
        label: "Trust",
        unit: "pts",
        start: 70,
        min: 0,
        max: 100,
        goodDirection: "up",
      },
    ],
    beats: [
      msg("b1", [
        [5, 2],
        [-5, -2],
      ]),
      msg("b2", [
        [10, 0],
        [0, 5],
        [-10, -5],
      ]),
      {
        kind: "numeric",
        id: "b3",
        prompt: "Set the cap.",
        control: { label: "Cap", unit: "/day", min: 1, max: 3, default: 2 },
        byValue: [
          { value: 1, effects: [{ meter: "delivery", delta: -20 }], note: "low" },
          { value: 2, effects: [{ meter: "delivery", delta: 15 }], note: "mid" },
          {
            value: 3,
            effects: [
              { meter: "delivery", delta: 25 },
              { meter: "reach", delta: -30 },
            ],
            note: "high",
          },
        ],
      },
      msg("b4", [
        [5, 5],
        [0, -10],
      ]),
      msg("b5", [
        [5, 0],
        [-5, 0],
      ]),
    ],
    launchLabel: "Wrap the day",
  };
}

const bands: DecisionBand[] = [
  { max: 49, outcome: "low" },
  { max: 84, outcome: "balanced" },
];

describe("applySelections", () => {
  it("sums choice and numeric effects from start values", () => {
    const finals = applySelections(fixture(), [
      { beatId: "b1", choiceIndex: 0 }, // delivery +5, trust +2
      { beatId: "b2", choiceIndex: 1 }, // trust +5
      { beatId: "b3", value: 2 }, // delivery +15
      { beatId: "b4", choiceIndex: 0 }, // delivery +5, trust +5
      { beatId: "b5", choiceIndex: 1 }, // delivery -5
    ]);
    expect(finals.delivery).toBe(50 + 5 + 15 + 5 - 5); // 70
    expect(finals.trust).toBe(70 + 2 + 5 + 5); // 82
    expect(finals.reach).toBe(90);
  });

  it("clamps to meter min/max", () => {
    const sim = fixture();
    const finals = applySelections(sim, [
      { beatId: "b1", choiceIndex: 0 },
      { beatId: "b2", choiceIndex: 0 },
      { beatId: "b3", value: 3 },
      { beatId: "b4", choiceIndex: 0 },
      { beatId: "b5", choiceIndex: 0 },
    ]);
    expect(finals.reach).toBe(60); // 90 - 30, no clamp needed
    expect(finals.delivery).toBeLessThanOrEqual(100);
  });
});

describe("decisiveRange", () => {
  it("computes achievable min/max of the decisive meter", () => {
    // delivery deltas per beat: b1 [-5,5] b2 [-10,10] b3 [-20,25] b4 [0,5] b5 [-5,5]
    const range = decisiveRange(fixture());
    expect(range.min).toBe(50 - 5 - 10 - 20 + 0 - 5); // 10
    expect(range.max).toBe(50 + 5 + 10 + 25 + 5 + 5); // 100
  });
});

describe("endingFor", () => {
  it("picks the first band whose max covers the value, else high", () => {
    expect(endingFor(30, bands)).toBe("low");
    expect(endingFor(49, bands)).toBe("low");
    expect(endingFor(50, bands)).toBe("balanced");
    expect(endingFor(84, bands)).toBe("balanced");
    expect(endingFor(85, bands)).toBe("high");
  });
});

describe("validateScenario", () => {
  it("passes the fixture", () => {
    expect(validateScenario(fixture(), bands)).toEqual([]);
  });

  it("catches structural violations", () => {
    const noDecisive = fixture();
    noDecisive.meters = noDecisive.meters.map((m) => ({
      ...m,
      decisive: false,
    }));
    expect(validateScenario(noDecisive, bands).join(" ")).toContain("decisive");

    const twoNumeric = fixture();
    twoNumeric.beats = [...twoNumeric.beats, twoNumeric.beats[2]];
    expect(validateScenario(twoNumeric, bands).join(" ")).toContain("numeric");

    const gap = fixture();
    const numeric = gap.beats[2];
    if (numeric.kind === "numeric") numeric.byValue = numeric.byValue.slice(1);
    expect(validateScenario(gap, bands).join(" ")).toContain("byValue");

    const badMeter = fixture();
    const first = badMeter.beats[0];
    if (first.kind === "message")
      first.choices[0].effects[0] = { meter: "ghost", delta: 1 };
    expect(validateScenario(badMeter, bands).join(" ")).toContain("ghost");
  });

  it("catches unreachable bands", () => {
    // Bands demanding delivery > 100 (above achievable max) for balanced
    const unreachable: DecisionBand[] = [
      { max: 100, outcome: "low" },
      { max: 120, outcome: "balanced" },
    ];
    expect(
      validateScenario(fixture(), unreachable).join(" ")
    ).toContain("balanced");
  });
});
