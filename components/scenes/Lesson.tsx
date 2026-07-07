"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activeVertical, type LessonCard } from "@/lib/content";
import { useFlowStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function CardBody({ card }: { card: LessonCard }) {
  switch (card.kind) {
    case "overview":
      return (
        <div className="space-y-4">
          {card.body.map((p, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-muted-foreground first:text-foreground/90"
            >
              {p}
            </p>
          ))}
        </div>
      );
    case "terms":
      return (
        <dl className="space-y-5">
          {card.terms.map((t) => (
            <div key={t.term}>
              <dt className="font-mono text-sm font-semibold text-primary">
                {t.term}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-foreground/90">
                {t.definition}
              </dd>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t.whyItMatters}
              </dd>
            </div>
          ))}
        </dl>
      );
    case "timeline":
      return (
        <ol className="relative space-y-5 border-l border-border pl-5">
          {card.entries.map((e) => (
            <li key={e.time} className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[23px] size-2 rounded-full bg-primary"
              />
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs font-medium text-primary">
                  {e.time}
                </span>
                <span className="text-sm font-semibold">{e.label}</span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {e.detail}
              </p>
            </li>
          ))}
        </ol>
      );
  }
}

export function Lesson() {
  const next = useFlowStore((s) => s.next);
  const reduceMotion = useReducedMotion();
  const { lesson } = activeVertical;
  const cards = lesson.cards;

  const [openId, setOpenId] = useState<string>(cards[0].id);
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set([cards[0].id])
  );

  const open = (id: string) => {
    setOpenId(id);
    setVisited((prev) => new Set(prev).add(id));
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="mb-3 font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase">
          Learn · {activeVertical.industry}
        </p>
        <h2 className="font-display text-3xl tracking-tight text-balance sm:text-4xl">
          {lesson.title}
        </h2>
        <p className="mt-3 max-w-xl text-muted-foreground">{lesson.subhead}</p>
      </div>

      {/* Desktop: horizontal expanding stack */}
      <div className="hidden min-h-[30rem] gap-3 md:flex">
        {cards.map((card, i) => {
          const isOpen = card.id === openId;
          return (
            <motion.div
              key={card.id}
              layout={!reduceMotion}
              transition={{ type: "spring", bounce: 0.15, duration: 0.55 }}
              onClick={() => open(card.id)}
              className={cn(
                "relative cursor-pointer overflow-hidden rounded-2xl border bg-card",
                isOpen
                  ? "flex-[4] border-border shadow-sm"
                  : "flex-[0.55] border-border/70 hover:border-primary/40 hover:bg-accent/40"
              )}
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  open(card.id);
                }
              }}
            >
              {isOpen ? (
                <motion.div
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                  className="flex h-full flex-col p-6"
                >
                  <p className="font-mono text-[0.68rem] font-medium tracking-[0.16em] text-primary uppercase">
                    {String(i + 1).padStart(2, "0")} · {card.eyebrow}
                  </p>
                  <h3 className="mt-2 font-display text-2xl tracking-tight">
                    {card.title}
                  </h3>
                  <div className="mt-4 flex-1 overflow-y-auto pr-1">
                    <CardBody card={card} />
                  </div>
                </motion.div>
              ) : (
                <div className="flex h-full flex-col items-center justify-between px-3 py-5">
                  <span className="font-mono text-[0.68rem] font-medium text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="text-sm font-medium whitespace-nowrap text-muted-foreground"
                    style={{ writingMode: "vertical-rl" }}
                  >
                    {card.eyebrow}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border",
                      visited.has(card.id)
                        ? "border-reach/40 bg-reach-soft text-reach"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Mobile: vertical accordion */}
      <div className="space-y-3 md:hidden">
        {cards.map((card, i) => {
          const isOpen = card.id === openId;
          return (
            <div
              key={card.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <button
                type="button"
                onClick={() => open(card.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="font-mono text-[0.68rem] font-medium text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <p className="font-mono text-[0.65rem] tracking-[0.14em] text-primary uppercase">
                    {card.eyebrow}
                  </p>
                  <p className="text-sm font-semibold">{card.title}</p>
                </div>
                <Plus
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-45"
                  )}
                  aria-hidden
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { height: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <div className="px-4 pb-5">
                      <CardBody card={card} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          {visited.size} of {cards.length} explored
        </p>
        <Button size="lg" className="h-11 px-6" onClick={next}>
          {lesson.cta}
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Button>
      </div>
    </section>
  );
}
