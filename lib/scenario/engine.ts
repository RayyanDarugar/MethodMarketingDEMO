import type {
  Beat,
  BeatSelection,
  DecisionBand,
  Effect,
  Meter,
  ScenarioSimulation,
} from "./types";

/**
 * Deterministic scenario math. Effects are additive and beats independent,
 * so achievable ranges are exact (sum of per-beat extremes) — which makes
 * generated scenarios statically validatable: every ending must be
 * reachable before we accept a module.
 */

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function effectsFor(beat: Beat, selection: BeatSelection | undefined): Effect[] {
  if (!selection) return [];
  if (beat.kind === "message") {
    return beat.choices[selection.choiceIndex ?? -1]?.effects ?? [];
  }
  return (
    beat.byValue.find((row) => row.value === selection.value)?.effects ?? []
  );
}

/** Final clamped meter values after applying the learner's selections. */
export function applySelections(
  sim: ScenarioSimulation,
  selections: BeatSelection[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const meter of sim.meters) totals[meter.id] = meter.start;

  const byBeat = new Map(selections.map((s) => [s.beatId, s]));
  for (const beat of sim.beats) {
    for (const effect of effectsFor(beat, byBeat.get(beat.id))) {
      if (effect.meter in totals) totals[effect.meter] += effect.delta;
    }
  }
  for (const meter of sim.meters) {
    totals[meter.id] = clamp(totals[meter.id], meter.min, meter.max);
  }
  return totals;
}

export function decisiveMeter(sim: ScenarioSimulation): Meter {
  const meter = sim.meters.find((m) => m.decisive);
  if (!meter) throw new Error("scenario has no decisive meter");
  return meter;
}

/** Per-beat extreme deltas for one meter. */
function deltaRange(beat: Beat, meterId: string): { min: number; max: number } {
  const options: Effect[][] =
    beat.kind === "message"
      ? beat.choices.map((c) => c.effects)
      : beat.byValue.map((row) => row.effects);
  let min = Infinity;
  let max = -Infinity;
  for (const effects of options) {
    const delta = effects
      .filter((e) => e.meter === meterId)
      .reduce((sum, e) => sum + e.delta, 0);
    min = Math.min(min, delta);
    max = Math.max(max, delta);
  }
  if (options.length === 0) return { min: 0, max: 0 };
  return { min, max };
}

/** Achievable [min, max] of the decisive meter across all selection paths. */
export function decisiveRange(sim: ScenarioSimulation): {
  min: number;
  max: number;
} {
  const meter = decisiveMeter(sim);
  let min = meter.start;
  let max = meter.start;
  for (const beat of sim.beats) {
    const range = deltaRange(beat, meter.id);
    min += range.min;
    max += range.max;
  }
  return {
    min: clamp(min, meter.min, meter.max),
    max: clamp(max, meter.min, meter.max),
  };
}

/** First band whose max covers the value wins; above all bands → "high". */
export function endingFor(
  decisiveValue: number,
  bands: DecisionBand[]
): "low" | "balanced" | "high" {
  for (const band of bands) {
    if (decisiveValue <= band.max) return band.outcome;
  }
  return "high";
}

/** All Tier B determinism rules from the spec. Returns error strings. */
export function validateScenario(
  sim: ScenarioSimulation,
  bands: DecisionBand[]
): string[] {
  const errors: string[] = [];
  const meterIds = new Set(sim.meters.map((m) => m.id));

  if (sim.meters.length !== 3) {
    errors.push(`simulation.meters must have exactly 3 entries (has ${sim.meters.length}).`);
  }
  const decisiveCount = sim.meters.filter((m) => m.decisive).length;
  if (decisiveCount !== 1) {
    errors.push(`exactly one meter must be decisive (has ${decisiveCount}).`);
  }
  for (const meter of sim.meters) {
    if (!(meter.min <= meter.start && meter.start <= meter.max)) {
      errors.push(`meter "${meter.id}" start must be within [min, max].`);
    }
  }

  if (sim.beats.length < 5 || sim.beats.length > 7) {
    errors.push(`simulation.beats must have 5-7 entries (has ${sim.beats.length}).`);
  }
  const numericBeats = sim.beats.filter((b) => b.kind === "numeric");
  if (numericBeats.length !== 1) {
    errors.push(`exactly one beat must be numeric (has ${numericBeats.length}).`);
  }

  const seenIds = new Set<string>();
  for (const beat of sim.beats) {
    if (seenIds.has(beat.id)) errors.push(`duplicate beat id "${beat.id}".`);
    seenIds.add(beat.id);

    const effectLists: { where: string; effects: Effect[] }[] =
      beat.kind === "message"
        ? beat.choices.map((c, i) => ({ where: `beat "${beat.id}" choice ${i}`, effects: c.effects }))
        : beat.byValue.map((row) => ({ where: `beat "${beat.id}" value ${row.value}`, effects: row.effects }));
    for (const { where, effects } of effectLists) {
      for (const effect of effects) {
        if (!meterIds.has(effect.meter)) {
          errors.push(`${where} references unknown meter "${effect.meter}".`);
        }
      }
    }

    if (beat.kind === "message") {
      if (beat.choices.length < 2 || beat.choices.length > 4) {
        errors.push(`beat "${beat.id}" must offer 2-4 choices (has ${beat.choices.length}).`);
      }
    } else {
      const { min, max, default: def } = beat.control;
      if (!(min < max)) errors.push(`beat "${beat.id}" control min must be < max.`);
      if (def < min || def > max) errors.push(`beat "${beat.id}" control default must be within [min, max].`);
      const values = new Set(beat.byValue.map((row) => row.value));
      for (let v = min; v <= max; v++) {
        if (!values.has(v)) {
          errors.push(`beat "${beat.id}" byValue is missing an entry for value=${v}.`);
        }
      }
    }
  }

  // Ending reachability over the decisive meter.
  if (decisiveCount === 1) {
    const range = decisiveRange(sim);
    const bandMaxes = bands.map((b) => b.max);
    if ([...bandMaxes].sort((a, b) => a - b).join() !== bandMaxes.join()) {
      errors.push("decision.bands must be sorted by ascending max.");
    }
    if (!bands.some((b) => b.outcome === "balanced")) {
      errors.push("decision.bands must include a 'balanced' band (the win state).");
    }
    // Each ending must be reachable: low needs range.min <= first band max;
    // balanced needs its band interval to intersect the range; high needs
    // range.max above every band max.
    const firstMax = bandMaxes[0] ?? -Infinity;
    const lastMax = bandMaxes[bandMaxes.length - 1] ?? -Infinity;
    if (bands[0]?.outcome === "low" && range.min > firstMax) {
      errors.push("the 'low' ending is unreachable (decisive meter cannot go low enough).");
    }
    const balancedBand = bands.find((b) => b.outcome === "balanced");
    if (balancedBand) {
      const balancedIndex = bands.indexOf(balancedBand);
      const lower = balancedIndex === 0 ? -Infinity : bands[balancedIndex - 1].max + 1;
      if (range.max < lower || range.min > balancedBand.max) {
        errors.push("the 'balanced' ending is unreachable for any selection path.");
      }
    }
    if (range.max <= lastMax) {
      errors.push("the 'high' ending is unreachable (decisive meter cannot exceed the last band).");
    }
  }

  return errors;
}
