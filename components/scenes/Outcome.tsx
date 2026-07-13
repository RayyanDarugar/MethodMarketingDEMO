"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Star,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applySelections,
  decisiveMeter,
  endingFor,
} from "@/lib/scenario/engine";
import { useFlowStore, useVertical } from "@/lib/store";
import { cn } from "@/lib/utils";

function MeterBar({
  label,
  value,
  unit,
  pct,
  tone,
  decisive,
  delay,
}: {
  label: string;
  value: number;
  unit: string;
  pct: number;
  tone: "good" | "warn" | "neutral";
  decisive: boolean;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {label}
          {decisive && (
            <Star
              className="size-3 text-primary"
              aria-label="Decided the outcome"
            />
          )}
        </span>
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            tone === "good" && "text-reach",
            tone === "warn" && "text-risk"
          )}
        >
          {Math.round(value)}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn(
            "h-full rounded-full",
            tone === "warn" ? "bg-risk" : decisive ? "bg-primary" : "bg-reach"
          )}
          initial={{ width: reduceMotion ? `${pct}%` : "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
    </div>
  );
}

export function Outcome() {
  const selections = useFlowStore((s) => s.selections);
  const retrySimulation = useFlowStore((s) => s.retrySimulation);
  const next = useFlowStore((s) => s.next);
  const reduceMotion = useReducedMotion();

  const vertical = useVertical();
  const sim = vertical.simulation;
  const finals = applySelections(sim, selections);
  const decisive = decisiveMeter(sim);
  const ending = endingFor(finals[decisive.id], vertical.decision.bands);
  const result = vertical.outcomes[ending];
  const isWin = result.status === "win";

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.1 } },
  };
  const item = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as const },
    },
  };

  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={item} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              isWin ? "bg-reach-soft text-reach" : "bg-risk-soft text-risk"
            )}
          >
            {isWin ? (
              <CheckCircle2 className="size-3.5" aria-hidden />
            ) : (
              <TriangleAlert className="size-3.5" aria-hidden />
            )}
            {isWin ? "Day handled" : "Day at risk"}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {decisive.label.toLowerCase()} landed at{" "}
            {Math.round(finals[decisive.id])}
            {decisive.unit}
          </span>
        </motion.div>

        <motion.h2
          variants={item}
          className="mt-4 font-display text-3xl tracking-tight text-balance sm:text-4xl"
        >
          {result.verdict}
        </motion.h2>

        <motion.p
          variants={item}
          className="mt-3 max-w-xl leading-relaxed text-muted-foreground"
        >
          {result.summary}
        </motion.p>

        <motion.div
          variants={item}
          className="mt-8 space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6"
        >
          {sim.meters.map((meter, i) => {
            const value = finals[meter.id] ?? meter.start;
            const pct =
              ((value - meter.min) / Math.max(1, meter.max - meter.min)) * 100;
            const delta = value - meter.start;
            const improved =
              meter.goodDirection === "up" ? delta >= 0 : delta <= 0;
            return (
              <MeterBar
                key={meter.id}
                label={meter.label}
                value={value}
                unit={meter.unit}
                pct={pct}
                tone={
                  meter.decisive ? "neutral" : improved ? "good" : "warn"
                }
                decisive={Boolean(meter.decisive)}
                delay={0.3 + i * 0.15}
              />
            );
          })}
        </motion.div>

        {result.risk && (
          <motion.div
            variants={item}
            role="alert"
            className="mt-4 flex gap-3 rounded-2xl border border-risk/25 bg-risk-soft p-4 sm:p-5"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-risk"
              aria-hidden
            />
            <div>
              <p className="text-sm font-semibold text-risk">
                {result.risk.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                {result.risk.body}
              </p>
            </div>
          </motion.div>
        )}

        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground"
        >
          <span className="font-semibold text-foreground">Why: </span>
          {result.coaching}
        </motion.p>

        <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-5"
            onClick={retrySimulation}
          >
            <RotateCcw data-icon="inline-start" aria-hidden />
            Replay the day
          </Button>
          <Button size="lg" className="h-11 px-6" onClick={next}>
            {isWin ? "See what this unlocks" : "Continue anyway"}
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
