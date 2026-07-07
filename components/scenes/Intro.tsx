"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, MonitorPlay, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activeVertical } from "@/lib/content";
import { useFlowStore } from "@/lib/store";

const ARC = [
  {
    icon: BookOpen,
    label: "Learn",
    detail: "The industry, its language, and the pressures behind the role.",
  },
  {
    icon: MonitorPlay,
    label: "Simulate",
    detail: "Sit in the seat. Make the call the role actually makes.",
  },
  {
    icon: PenLine,
    label: "Produce",
    detail: "See the difference in your own output — side by side.",
  },
];

export function Intro() {
  const next = useFlowStore((s) => s.next);
  const reduceMotion = useReducedMotion();
  const { intro } = activeVertical;

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.12 } },
  };
  const item = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const },
    },
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.p
          variants={item}
          className="mb-5 font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase"
        >
          {intro.eyebrow}
        </motion.p>

        <motion.h1
          variants={item}
          className="font-display text-4xl leading-[1.08] tracking-tight text-balance sm:text-5xl md:text-[3.4rem]"
        >
          {intro.headline}
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          {intro.subhead}
        </motion.p>

        <motion.div
          variants={item}
          className="mt-12 grid gap-3 sm:grid-cols-3"
        >
          {ARC.map((step, i) => (
            <div
              key={step.label}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-2">
                <step.icon className="size-4 text-primary" aria-hidden />
                <span className="text-sm font-semibold">{step.label}</span>
                {i < ARC.length - 1 && (
                  <ArrowRight
                    className="ml-auto size-3.5 text-muted-foreground/50"
                    aria-hidden
                  />
                )}
              </div>
              <p className="mt-2 text-sm leading-snug text-muted-foreground">
                {step.detail}
              </p>
            </div>
          ))}
        </motion.div>

        <motion.div variants={item} className="mt-12">
          <Button size="lg" className="h-11 px-6 text-base" onClick={next}>
            {intro.cta}
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            About four minutes, one decision that matters.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
