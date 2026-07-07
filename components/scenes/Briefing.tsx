"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CircleCheck,
  CircleX,
  MonitorPlay,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { activeVertical, type QuizQuestion } from "@/lib/content";
import { useFlowStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function Quiz({ question }: { question: QuizQuestion }) {
  const reduceMotion = useReducedMotion();
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const option = answered ? question.options[picked] : null;

  return (
    <div>
      <p className="text-sm font-medium leading-snug">{question.question}</p>
      <div className="mt-3 space-y-2">
        {question.options.map((opt, i) => {
          const isPicked = picked === i;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={answered && !isPicked}
              onClick={() => !answered && setPicked(i)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                !answered &&
                  "border-border bg-card hover:border-primary/40 hover:bg-accent/50",
                answered && isPicked && opt.correct &&
                  "border-reach/40 bg-reach-soft",
                answered && isPicked && !opt.correct &&
                  "border-risk/40 bg-risk-soft",
                answered && !isPicked && "border-border/60 bg-card opacity-50"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border",
                  answered && isPicked
                    ? opt.correct
                      ? "border-reach bg-reach text-white"
                      : "border-risk bg-risk text-white"
                    : "border-input"
                )}
              >
                {answered && isPicked && <Check className="size-3" />}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {option && (
          <motion.p
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-3 flex gap-2 rounded-xl p-3 text-sm leading-relaxed",
              option.correct
                ? "bg-reach-soft text-foreground/85"
                : "bg-risk-soft text-foreground/85"
            )}
          >
            {option.correct ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-reach" aria-hidden />
            ) : (
              <CircleX className="mt-0.5 size-4 shrink-0 text-risk" aria-hidden />
            )}
            <span>{option.feedback}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Briefing() {
  const next = useFlowStore((s) => s.next);
  const reduceMotion = useReducedMotion();
  const { briefing, simulation } = activeVertical;

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
    <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-10 lg:grid-cols-[1.2fr_1fr]"
      >
        <div>
          <motion.p
            variants={item}
            className="mb-3 font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase"
          >
            {briefing.eyebrow}
          </motion.p>
          <motion.h2
            variants={item}
            className="font-display text-3xl tracking-tight text-balance sm:text-4xl"
          >
            {briefing.title}
          </motion.h2>

          <motion.div variants={item} className="mt-5 space-y-4">
            {briefing.mission.map((p, i) => (
              <p
                key={i}
                className="max-w-xl leading-relaxed text-muted-foreground first:text-foreground/90"
              >
                {p}
              </p>
            ))}
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4 text-primary" aria-hidden />
              You&apos;ll make two decisions
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {briefing.decisions.map((d, i) => (
                <div
                  key={d.label}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <p className="font-mono text-[0.65rem] tracking-[0.14em] text-primary uppercase">
                    Decision {i + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{d.label}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {d.summary}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <MonitorPlay className="size-4 text-primary" aria-hidden />
              What good looks like
            </h3>
            <ul className="mt-3 space-y-2.5">
              {briefing.objectives.map((o) => (
                <li key={o.label} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full bg-reach-soft"
                  >
                    <Check className="size-3 text-reach" />
                  </span>
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">{o.label}.</span>{" "}
                    <span className="text-muted-foreground">{o.detail}</span>
                  </p>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={item} className="mt-10">
            <Button size="lg" className="h-11 px-6" onClick={next}>
              {briefing.cta}
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              You&apos;ll be dropped into {simulation.productName}, a simulated ad
              server. The coach is one click away if you get stuck.
            </p>
          </motion.div>
        </div>

        <motion.aside
          variants={item}
          className="h-fit rounded-2xl border border-border bg-card p-5 sm:p-6 lg:mt-10"
        >
          <p className="font-mono text-[0.68rem] font-medium tracking-[0.16em] text-primary uppercase">
            {briefing.quizTitle}
          </p>
          <div className="mt-5 space-y-8">
            {briefing.quiz.map((q) => (
              <Quiz key={q.id} question={q} />
            ))}
          </div>
        </motion.aside>
      </motion.div>
    </section>
  );
}
