"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activeVertical, type ConfigQuestion } from "@/lib/content";
import { useFlowStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function QuestionGroup({ question }: { question: ConfigQuestion }) {
  const selected = useFlowStore((s) => s.profile[question.id] ?? []);
  const setProfile = useFlowStore((s) => s.setProfile);

  const toggle = (value: string) => {
    if (question.multi) {
      const next = selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value];
      // Never allow an empty multi-select — the demo always has a direction.
      if (next.length > 0) setProfile(question.id, next);
    } else {
      setProfile(question.id, [value]);
    }
  };

  return (
    <fieldset>
      <legend className="text-sm font-semibold">{question.label}</legend>
      {question.helper && (
        <p className="mt-0.5 text-xs text-muted-foreground">{question.helper}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {question.options.map((opt) => {
          const isOn = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              role={question.multi ? "checkbox" : "radio"}
              aria-checked={isOn}
              onClick={() => toggle(opt.value)}
              className={cn(
                "group rounded-xl border px-3.5 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isOn
                  ? "border-primary/50 bg-accent"
                  : "border-border bg-card hover:border-primary/35 hover:bg-accent/40"
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-3.5 items-center justify-center rounded-full border transition-colors",
                    isOn
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-transparent"
                  )}
                >
                  {isOn && <Check className="size-2.5" />}
                </span>
                {opt.label}
              </span>
              {opt.description && (
                <span className="mt-0.5 block pl-5 text-xs text-muted-foreground">
                  {opt.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Setup() {
  const next = useFlowStore((s) => s.next);
  const reduceMotion = useReducedMotion();
  const { config } = activeVertical;

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
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
    <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.p
          variants={item}
          className="mb-3 font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase"
        >
          {config.eyebrow}
        </motion.p>
        <motion.h2
          variants={item}
          className="font-display text-3xl tracking-tight text-balance sm:text-4xl"
        >
          {config.title}
        </motion.h2>
        <motion.p
          variants={item}
          className="mt-3 max-w-xl leading-relaxed text-muted-foreground"
        >
          {config.subhead}
        </motion.p>

        <motion.div
          variants={item}
          className="mt-8 space-y-8 rounded-2xl border border-border bg-card p-5 sm:p-7"
        >
          {config.questions.map((q) => (
            <QuestionGroup key={q.id} question={q} />
          ))}
        </motion.div>

        <motion.div variants={item} className="mt-6">
          <Button size="lg" className="h-11 px-6" onClick={next}>
            {config.cta}
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
            {config.note}
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
