"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activeVertical, type EmailCard } from "@/lib/content";
import { useFlowStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Renders [[term]] markers from content as highlighted domain vocabulary. */
function EmailText({ text }: { text: string }) {
  const parts = text.split(/(\[\[.*?\]\])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("[[") ? (
          <mark
            key={i}
            className="rounded bg-accent px-1 py-px font-medium text-accent-foreground"
          >
            {part.slice(2, -2)}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function Email({ card, featured }: { card: EmailCard; featured?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card",
        featured
          ? "border-primary/35 shadow-lg shadow-primary/10"
          : "border-border"
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <span
          className={cn(
            "text-sm font-semibold",
            featured ? "text-primary" : "text-muted-foreground"
          )}
        >
          {card.label}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            featured
              ? "bg-reach-soft text-reach"
              : "bg-muted text-muted-foreground"
          )}
        >
          {card.sublabel}
        </span>
      </div>
      <div className="flex-1 p-5">
        <p className="text-xs text-muted-foreground">Subject</p>
        <p className="mt-0.5 text-sm font-semibold">{card.subject}</p>
        <div className="mt-4 space-y-3">
          {card.body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-foreground/85">
              <EmailText text={p} />
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Payoff() {
  const restart = useFlowStore((s) => s.restart);
  const reduceMotion = useReducedMotion();
  const { payoff } = activeVertical;

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.12 } },
  };
  const item = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const },
    },
  };

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.p
          variants={item}
          className="mb-3 font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase"
        >
          Produce
        </motion.p>
        <motion.h2
          variants={item}
          className="font-display text-3xl tracking-tight text-balance sm:text-4xl"
        >
          {payoff.headline}
        </motion.h2>
        <motion.p
          variants={item}
          className="mt-3 max-w-2xl leading-relaxed text-muted-foreground"
        >
          {payoff.subhead}
        </motion.p>

        <motion.div variants={item} className="mt-10 grid gap-4 md:grid-cols-2">
          <Email card={payoff.before} />
          <Email card={payoff.after} featured />
        </motion.div>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl border border-reach/25 bg-reach-soft/60 p-5 sm:flex-row sm:items-center sm:p-6"
        >
          <div className="flex items-start gap-3">
            <BadgeCheck className="mt-0.5 size-6 shrink-0 text-reach" aria-hidden />
            <div>
              <p className="font-display text-lg tracking-tight">
                {payoff.completion.title}
              </p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                {payoff.completion.body}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="h-11 shrink-0 bg-card px-5"
            onClick={restart}
          >
            <RotateCcw data-icon="inline-start" aria-hidden />
            {payoff.restartLabel}
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
