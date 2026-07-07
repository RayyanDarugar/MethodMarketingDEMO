"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activeVertical,
  evaluateSimulation,
  priorityNote,
} from "@/lib/content";
import { useFlowStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function DeliveryBar({
  label,
  pct,
  detail,
  color,
  delay,
}: {
  label: string;
  pct: number;
  detail: string;
  color: string;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: reduceMotion ? `${pct}%` : "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function Outcome() {
  const choices = useFlowStore((s) => s.choices);
  const retrySimulation = useFlowStore((s) => s.retrySimulation);
  const next = useFlowStore((s) => s.next);
  const reduceMotion = useReducedMotion();

  const result = evaluateSimulation(activeVertical, choices);
  const pNote = priorityNote(activeVertical, choices.priority);
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
            {isWin ? "Flight delivered" : "Flight at risk"}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            cap {choices.frequencyCap}/user/day · {choices.priority} priority
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
          <DeliveryBar
            label="Unique reach"
            pct={result.reachPct}
            detail="Share of the target audience that saw the ad at least once."
            color="bg-reach"
            delay={0.3}
          />
          <DeliveryBar
            label="Budget delivered"
            pct={result.deliveryPct}
            detail="Share of the contracted spend the ad server could actually serve."
            color="bg-primary"
            delay={0.45}
          />

          <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
            {result.metrics.map((m) => (
              <div key={m.label}>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-sm font-semibold",
                    m.tone === "good" && "text-reach",
                    m.tone === "warn" && "text-risk"
                  )}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
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

        {pNote && (
          <motion.p
            variants={item}
            className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground sm:p-5"
          >
            <span
              className={cn(
                "font-semibold",
                pNote.tone === "good" ? "text-reach" : "text-risk"
              )}
            >
              Priority check —{" "}
            </span>
            {pNote.text}
          </motion.p>
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
            Adjust and relaunch
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
