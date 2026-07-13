"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Headphones,
  Mail,
  MessageSquare,
  Rocket,
  Star,
  Ticket,
} from "lucide-react";
import { Assistant } from "@/components/ui/Assistant";
import { SceneThumbs } from "@/components/FeedbackControls";
import { ARCHETYPE_CHROME } from "@/components/simulation/skins";
import { Slider } from "@/components/ui/slider";
import {
  applySelections,
  decisiveMeter,
  endingFor,
} from "@/lib/scenario/engine";
import type {
  Beat,
  BeatChannel,
  BeatSelection,
  MessageBeat,
  NumericBeat,
  ScenarioSimulation,
} from "@/lib/scenario/types";
import { useFlowStore, useVertical } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Shared Tier B scenario player: one beat at a time, choices with revealed
 * consequences, a numeric centerpiece with live per-value preview, and a
 * persistent meter panel. Archetype skins wrap this with their own chrome.
 */

const CHANNEL_META: Record<
  BeatChannel,
  { icon: typeof Mail; label: string }
> = {
  email: { icon: Mail, label: "Email" },
  chat: { icon: MessageSquare, label: "Chat" },
  call: { icon: Headphones, label: "Call" },
  ticket: { icon: Ticket, label: "Ticket" },
};

function MeterPanel({
  sim,
  values,
}: {
  sim: ScenarioSimulation;
  values: Record<string, number>;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Live meters
      </p>
      {sim.meters.map((meter) => {
        const value = values[meter.id] ?? meter.start;
        const pct =
          ((value - meter.min) / Math.max(1, meter.max - meter.min)) * 100;
        const delta = value - meter.start;
        return (
          <div key={meter.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1 text-sm font-medium">
                {meter.label}
                {meter.decisive && (
                  <Star
                    className="size-3 text-primary"
                    aria-label="Decides the outcome"
                  />
                )}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {Math.round(value)}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                  {meter.unit}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  meter.decisive ? "bg-primary" : "bg-reach"
                )}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              />
            </div>
            {delta !== 0 && (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {delta > 0 ? "+" : ""}
                {Math.round(delta)} since start
              </p>
            )}
          </div>
        );
      })}
      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        <Star className="mr-1 inline size-2.5 text-primary" aria-hidden />
        marks the meter that decides the outcome. Every response moves
        something.
      </p>
    </div>
  );
}

function MessageBeatCard({
  beat,
  answer,
  onChoose,
}: {
  beat: MessageBeat;
  answer?: number;
  onChoose: (index: number) => void;
}) {
  const meta = CHANNEL_META[beat.channel];
  const Icon = meta.icon;
  const answered = answer !== undefined;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        <span className="font-medium">{meta.label}</span>
        <span aria-hidden>·</span>
        <span>
          {beat.from.name} — {beat.from.role}
        </span>
      </div>
      {beat.subject && (
        <p className="mt-2 text-sm font-semibold">{beat.subject}</p>
      )}
      <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">
        {beat.body}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {beat.choices.map((choice, i) => (
          <button
            key={i}
            type="button"
            disabled={answered}
            onClick={() => onChoose(i)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              answered && i === answer
                ? "border-primary bg-accent font-medium"
                : answered
                  ? "border-border opacity-40"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {answered && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground"
          >
            {beat.choices[answer].consequence}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function NumericBeatCard({
  beat,
  answer,
  onCommit,
  riskFor,
  riskLabels,
}: {
  beat: NumericBeat;
  answer?: number;
  onCommit: (value: number) => void;
  /** Ending this value would steer the day toward, all else equal. */
  riskFor: (value: number) => "low" | "balanced" | "high";
  riskLabels: { low: string; high: string };
}) {
  const [value, setValue] = useState(answer ?? beat.control.default);
  const committed = answer !== undefined;
  const row = beat.byValue.find((r) => r.value === value);
  const risk = riskFor(value);

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-4 sm:p-5">
      <p className="text-xs font-semibold tracking-wide text-primary uppercase">
        The decision that matters
      </p>
      <p className="mt-2 text-sm leading-relaxed">{beat.prompt}</p>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">{beat.control.label}</span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {value}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {beat.control.unit}
            </span>
          </span>
        </div>
        <Slider
          aria-label={beat.control.label}
          min={beat.control.min}
          max={beat.control.max}
          step={1}
          disabled={committed}
          value={[value]}
          onValueChange={(v) => setValue(Array.isArray(v) ? v[0] : v)}
          className="mt-3"
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>{beat.control.min}</span>
          <span>{beat.control.max}</span>
        </div>
      </div>

      {row && (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {row.note}
        </p>
      )}

      <AnimatePresence>
        {risk !== "balanced" && (
          <motion.p
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            role="status"
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-risk-soft px-3 py-1 text-[11px] font-semibold text-risk"
          >
            <span className="size-1.5 rounded-full bg-risk" aria-hidden />
            {risk === "high" ? riskLabels.high : riskLabels.low}
          </motion.p>
        )}
      </AnimatePresence>

      {!committed && (
        <button
          type="button"
          onClick={() => onCommit(value)}
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Commit this setting
        </button>
      )}
    </div>
  );
}

export function ScenarioPlayer() {
  const vertical = useVertical();
  const launchSimulation = useFlowStore((s) => s.launchSimulation);
  const reduceMotion = useReducedMotion();
  const sim = vertical.simulation;
  const chrome = ARCHETYPE_CHROME[sim.archetype];

  const [answers, setAnswers] = useState<BeatSelection[]>([]);
  const answerFor = (beat: Beat) =>
    answers.find((a) => a.beatId === beat.id);

  const liveMeters = useMemo(
    () => applySelections(sim, answers),
    [sim, answers]
  );

  const visibleCount = Math.min(answers.length + 1, sim.beats.length);
  const allAnswered = answers.length >= sim.beats.length;

  const answer = (selection: BeatSelection) =>
    setAnswers((prev) => [
      ...prev.filter((a) => a.beatId !== selection.beatId),
      ...[selection],
    ]);

  /** Which ending this numeric value steers toward, given current answers. */
  const riskFor = (beatId: string) => (value: number) => {
    const hypothetical = [
      ...answers.filter((a) => a.beatId !== beatId),
      { beatId, value },
    ];
    const finals = applySelections(sim, hypothetical);
    return endingFor(finals[decisiveMeter(sim).id], vertical.decision.bands);
  };

  return (
    <chrome.Frame sim={sim}>
    <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {sim.environmentLabel}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
          {sim.header.map((fact) => (
            <div key={fact.label}>
              <p className="text-[11px] text-muted-foreground">{fact.label}</p>
              <p className="mt-0.5 text-sm font-semibold">{fact.value}</p>
              {fact.sublabel && (
                <p className="text-[11px] text-muted-foreground">
                  {fact.sublabel}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-4">
          {sim.beats.slice(0, visibleCount).map((beat) => {
            const selection = answerFor(beat);
            return (
              <motion.div
                key={beat.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              >
                {beat.kind === "message" ? (
                  <MessageBeatCard
                    beat={beat}
                    answer={selection?.choiceIndex}
                    onChoose={(choiceIndex) =>
                      answer({ beatId: beat.id, choiceIndex })
                    }
                  />
                ) : (
                  <NumericBeatCard
                    beat={beat}
                    answer={selection?.value}
                    onCommit={(value) => answer({ beatId: beat.id, value })}
                    riskFor={riskFor(beat.id)}
                    riskLabels={{
                      low: chrome.lowRiskLabel,
                      high: chrome.highRiskLabel,
                    }}
                  />
                )}
              </motion.div>
            );
          })}

          {allAnswered && (
            <motion.button
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              type="button"
              onClick={() => launchSimulation(answers)}
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Rocket className="size-4" aria-hidden />
              {sim.launchLabel}
            </motion.button>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
          <MeterPanel sim={sim} values={liveMeters} />
          <SceneThumbs scene="simulation" />
        </div>
      </div>

      <Assistant
        verticalId={vertical.id}
        scene="simulation"
        buttonLabel={vertical.assistant.buttonLabel}
        getContext={() => ({ answers })}
      />
    </section>
    </chrome.Frame>
  );
}
