"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  CornerDownLeft,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cardQuestionProvider } from "@/lib/assistant";
import {
  type FlowStage,
  type LessonCard,
  type Pressure,
  type Term,
  type TimelineEntry,
} from "@/lib/content";
import { useFlowStore, useVertical } from "@/lib/store";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Kind-specific interactive renderers
// ---------------------------------------------------------------------------

function FlowStages({ stages }: { stages: FlowStage[] }) {
  const [selected, setSelected] = useState(0);
  const stage = stages[selected];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                className="size-3.5 text-muted-foreground/40"
                aria-hidden
              />
            )}
            <button
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected === i
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {s.name}
            </button>
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 rounded-xl border border-border bg-background/60 p-4"
        >
          <p className="text-sm font-semibold">
            {stage.name}
            <span className="ml-2 font-normal text-muted-foreground">
              — {stage.tagline}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/85">
            {stage.detail}
          </p>
          <p className="mt-3 border-l-2 border-risk/40 pl-3 text-sm leading-relaxed text-muted-foreground italic">
            Keeps them up at night: {stage.worry}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TermsList({ terms }: { terms: Term[] }) {
  const [openTerm, setOpenTerm] = useState(0);
  return (
    <div className="divide-y divide-border">
      {terms.map((t, i) => {
        const isOpen = openTerm === i;
        return (
          <div key={t.term}>
            <button
              type="button"
              onClick={() => setOpenTerm(i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span
                className={cn(
                  "font-mono text-sm font-semibold",
                  isOpen ? "text-primary" : "text-foreground/80"
                )}
              >
                {t.term}
              </span>
              <Plus
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-45"
                )}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pb-3.5">
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {t.definition}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t.whyItMatters}
                    </p>
                    <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs leading-relaxed text-foreground/75">
                      {t.heardAs}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function PressuresList({ pressures }: { pressures: Pressure[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-2">
      {pressures.map((p, i) => {
        const isOpen = open === i;
        return (
          <div
            key={p.title}
            className={cn(
              "rounded-xl border transition-colors",
              isOpen ? "border-border bg-background/60" : "border-border/60"
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="text-sm font-semibold">
                <span className="mr-2 font-mono text-xs text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {p.title}
              </span>
              <Plus
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-45"
                )}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {p.body}
                    </p>
                    <p className="mt-2.5 inline-block rounded-lg bg-risk-soft px-3 py-1.5 text-xs font-medium text-risk">
                      {p.consequence}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const [selected, setSelected] = useState(0);
  return (
    <ol className="relative border-l border-border">
      {entries.map((e, i) => {
        const isSelected = selected === i;
        return (
          <li key={e.time} className="relative pb-1 pl-5">
            <span
              aria-hidden
              className={cn(
                "absolute top-2 -left-[4.5px] size-2 rounded-full transition-colors",
                isSelected ? "bg-primary" : "bg-border"
              )}
            />
            <button
              type="button"
              onClick={() => setSelected(i)}
              aria-expanded={isSelected}
              className="flex w-full items-baseline gap-2 py-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span
                className={cn(
                  "font-mono text-xs font-medium",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              >
                {e.time}
              </span>
              <span
                className={cn(
                  "text-sm",
                  isSelected
                    ? "font-semibold"
                    : "font-medium text-muted-foreground"
                )}
              >
                {e.label}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.p
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden pb-2 text-sm leading-relaxed text-muted-foreground"
                >
                  {e.detail}
                </motion.p>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ol>
  );
}

function CardBody({ card }: { card: LessonCard }) {
  switch (card.kind) {
    case "flow":
      return <FlowStages stages={card.stages} />;
    case "terms":
      return <TermsList terms={card.terms} />;
    case "pressures":
      return <PressuresList pressures={card.pressures} />;
    case "timeline":
      return <Timeline entries={card.entries} />;
  }
}

// ---------------------------------------------------------------------------
// Ask-the-coach panel (scripted Q&A per card)
// ---------------------------------------------------------------------------

interface QA {
  question: string;
  answer?: string;
}

function CoachPanel({
  card,
  thread,
  onAsk,
}: {
  card: LessonCard;
  thread: QA[];
  onAsk: (question: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const pending = thread.some((qa) => qa.answer === undefined);
  const askedQuestions = new Set(thread.map((qa) => qa.question));
  const suggestions = card.followUps.filter(
    (fu) => !askedQuestions.has(fu.question)
  );

  const submit = () => {
    const q = draft.trim();
    if (!q || pending) return;
    setDraft("");
    onAsk(q);
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl bg-muted/60 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground/80">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        Ask the coach
      </p>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {thread.length === 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Anything on this card unclear? Tap a question or ask your own.
          </p>
        )}
        {thread.map((qa, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-4 rounded-xl rounded-br-sm bg-primary/10 px-3 py-2 text-xs leading-relaxed font-medium text-accent-foreground">
              {qa.question}
            </p>
            {qa.answer === undefined ? (
              <p
                className="px-1 font-mono text-xs text-muted-foreground"
                role="status"
              >
                thinking…
              </p>
            ) : (
              <p className="mr-2 rounded-xl rounded-bl-sm bg-card px-3 py-2 text-xs leading-relaxed text-foreground/85 shadow-sm">
                {qa.answer}
              </p>
            )}
          </div>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((fu) => (
            <button
              key={fu.question}
              type="button"
              disabled={pending}
              onClick={() => onAsk(fu.question)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            >
              {fu.question}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-input bg-card px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring/60">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask your own question…"
          aria-label={`Ask a question about ${card.title}`}
          className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim() || pending}
          aria-label="Send question"
          className="text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
        >
          <CornerDownLeft className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function Lesson() {
  const next = useFlowStore((s) => s.next);
  const reduceMotion = useReducedMotion();
  const vertical = useVertical();
  const { lesson } = vertical;
  const cards = lesson.cards;

  const [openId, setOpenId] = useState<string>(cards[0].id);
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set([cards[0].id])
  );
  const [threads, setThreads] = useState<Record<string, QA[]>>({});
  const askSeq = useRef(0);

  const open = (id: string) => {
    setOpenId(id);
    setVisited((prev) => new Set(prev).add(id));
  };

  const ask = useCallback((cardId: string, question: string) => {
    askSeq.current += 1;
    setThreads((prev) => ({
      ...prev,
      [cardId]: [...(prev[cardId] ?? []), { question }],
    }));
    void cardQuestionProvider({
      verticalId: vertical.id,
      cardId,
      question,
    }).then((answer) => {
      setThreads((prev) => ({
        ...prev,
        [cardId]: (prev[cardId] ?? []).map((qa) =>
          qa.question === question && qa.answer === undefined
            ? { ...qa, answer: answer.text }
            : qa
        ),
      }));
    });
  }, [vertical.id]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="mb-3 font-mono text-xs font-medium tracking-[0.18em] text-primary uppercase">
          Learn · {vertical.industry}
        </p>
        <h2 className="font-display text-3xl tracking-tight text-balance sm:text-4xl">
          {lesson.title}
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{lesson.subhead}</p>
      </div>

      {/* Desktop: horizontal expanding stack */}
      <div className="hidden min-h-[34rem] gap-3 md:flex">
        {cards.map((card, i) => {
          const isOpen = card.id === openId;
          return (
            <motion.div
              key={card.id}
              layout={!reduceMotion}
              transition={{ type: "spring", bounce: 0.15, duration: 0.55 }}
              onClick={() => !isOpen && open(card.id)}
              className={cn(
                "relative overflow-hidden rounded-2xl border bg-card",
                isOpen
                  ? "flex-[5] border-border shadow-sm"
                  : "flex-[0.5] cursor-pointer border-border/70 hover:border-primary/40 hover:bg-accent/40"
              )}
              role={isOpen ? undefined : "button"}
              tabIndex={isOpen ? undefined : 0}
              aria-expanded={isOpen}
              onKeyDown={(e) => {
                if (!isOpen && (e.key === "Enter" || e.key === " ")) {
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
                  className="grid h-full grid-cols-[1fr_290px] gap-5 p-6"
                >
                  <div className="flex min-h-0 flex-col">
                    <p className="font-mono text-[0.68rem] font-medium tracking-[0.16em] text-primary uppercase">
                      {String(i + 1).padStart(2, "0")} · {card.eyebrow}
                    </p>
                    <h3 className="mt-2 font-display text-2xl tracking-tight">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {card.lede}
                    </p>
                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2">
                      <CardBody card={card} />
                    </div>
                  </div>
                  <CoachPanel
                    card={card}
                    thread={threads[card.id] ?? []}
                    onAsk={(q) => ask(card.id, q)}
                  />
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
                      reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <div className="space-y-4 px-4 pb-5">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {card.lede}
                      </p>
                      <CardBody card={card} />
                      <CoachPanel
                        card={card}
                        thread={threads[card.id] ?? []}
                        onAsk={(q) => ask(card.id, q)}
                      />
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
