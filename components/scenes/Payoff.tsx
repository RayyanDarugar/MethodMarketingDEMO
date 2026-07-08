"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BadgeCheck,
  Check,
  ClipboardCopy,
  Download,
  LayoutTemplate,
  Lightbulb,
  Mail,
  PhoneCall,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activeVertical,
  profileLabels,
  type Artifact,
  type EmailCard,
} from "@/lib/content";
import {
  artifactToMarkdown,
  buildClaudeContext,
  copyText,
  downloadMarkdown,
} from "@/lib/export";
import { useFlowStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Renders [[term]] markers from content as highlighted domain vocabulary. */
function RichText({ text }: { text: string }) {
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
              <RichText text={p} />
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolkit panels
// ---------------------------------------------------------------------------

const ARTIFACT_ICONS = {
  emailSequence: Mail,
  callScript: PhoneCall,
  landingPage: LayoutTemplate,
  ideas: Lightbulb,
} as const;

function EmailSequencePanel({
  artifact,
}: {
  artifact: Extract<Artifact, { kind: "emailSequence" }>;
}) {
  const [active, setActive] = useState(0);
  const email = artifact.emails[active];
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {artifact.emails.map((e, i) => (
          <button
            key={e.day}
            type="button"
            aria-pressed={active === i}
            onClick={() => setActive(i)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active === i
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {e.day}
            <span className="ml-1.5 hidden font-normal opacity-80 sm:inline">
              {e.purpose}
            </span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={email.day}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 rounded-xl border border-border bg-background/60 p-5"
        >
          <p className="text-xs text-muted-foreground">Subject</p>
          <p className="mt-0.5 text-sm font-semibold">{email.subject}</p>
          <div className="mt-3 space-y-3">
            {email.body.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/85">
                <RichText text={p} />
              </p>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CallScriptPanel({
  artifact,
}: {
  artifact: Extract<Artifact, { kind: "callScript" }>;
}) {
  return (
    <div>
      <p className="rounded-xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground italic">
        {artifact.scenario}
      </p>
      <div className="mt-4 space-y-5">
        {artifact.sections.map((section) => (
          <div key={section.heading}>
            <p className="font-mono text-[0.68rem] font-medium tracking-[0.14em] text-primary uppercase">
              {section.heading}
            </p>
            <div className="mt-2 space-y-2">
              {section.lines.map((line, i) =>
                line.speaker === "you" ? (
                  <p
                    key={i}
                    className="rounded-xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground/90"
                  >
                    <RichText text={line.text} />
                  </p>
                ) : (
                  <p
                    key={i}
                    className="flex gap-2 pl-1 text-xs leading-relaxed text-muted-foreground"
                  >
                    <Sparkles
                      className="mt-0.5 size-3 shrink-0 text-primary/60"
                      aria-hidden
                    />
                    {line.text}
                  </p>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingPagePanel({
  artifact,
}: {
  artifact: Extract<Artifact, { kind: "landingPage" }>;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </span>
        <span className="ml-2 flex-1 rounded-md bg-background/80 px-3 py-1 font-mono text-[0.65rem] text-muted-foreground">
          atlascloud.com/ad-operations
        </span>
      </div>
      {/* Hero */}
      <div className="px-6 py-10 text-center sm:px-10">
        <p className="font-mono text-[0.65rem] font-medium tracking-[0.16em] text-primary uppercase">
          {artifact.hero.eyebrow}
        </p>
        <h4 className="mx-auto mt-3 max-w-md font-display text-2xl tracking-tight text-balance sm:text-3xl">
          <RichText text={artifact.hero.headline} />
        </h4>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
          <RichText text={artifact.hero.subhead} />
        </p>
        <span className="mt-5 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          {artifact.hero.cta}
        </span>
      </div>
      {/* Value props */}
      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-3">
        {artifact.valueProps.map((vp) => (
          <div key={vp.title} className="bg-card p-5">
            <p className="text-sm font-semibold">{vp.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              <RichText text={vp.body} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdeasPanel({
  artifact,
}: {
  artifact: Extract<Artifact, { kind: "ideas" }>;
}) {
  return (
    <ol className="space-y-2.5">
      {artifact.ideas.map((idea, i) => (
        <li
          key={idea.title}
          className="flex gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <span className="font-mono text-xs font-medium text-primary">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <p className="text-sm font-semibold">{idea.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {idea.angle}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ArtifactPanel({ artifact }: { artifact: Artifact }) {
  switch (artifact.kind) {
    case "emailSequence":
      return <EmailSequencePanel artifact={artifact} />;
    case "callScript":
      return <CallScriptPanel artifact={artifact} />;
    case "landingPage":
      return <LandingPagePanel artifact={artifact} />;
    case "ideas":
      return <IdeasPanel artifact={artifact} />;
  }
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function Payoff() {
  const restart = useFlowStore((s) => s.restart);
  const profile = useFlowStore((s) => s.profile);
  const reduceMotion = useReducedMotion();
  const { payoff, config } = activeVertical;

  const [activeArtifactId, setActiveArtifactId] = useState(
    payoff.toolkit.artifacts[0].id
  );
  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeArtifact =
    payoff.toolkit.artifacts.find((a) => a.id === activeArtifactId) ??
    payoff.toolkit.artifacts[0];

  const markCopied = (key: string) => {
    setCopied(key);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 2000);
  };

  const copyArtifact = async (artifact: Artifact) => {
    if (await copyText(artifactToMarkdown(artifact))) {
      markCopied(artifact.id);
    }
  };

  const copyContextPack = async () => {
    if (await copyText(buildClaudeContext(activeVertical, profile))) {
      markCopied("context-pack");
    }
  };

  const downloadContextPack = () => {
    downloadMarkdown(
      "method-marketing-adtech-context.md",
      buildClaudeContext(activeVertical, profile)
    );
    markCopied("download");
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.1 } },
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
        <motion.div
          variants={item}
          className="mt-4 flex flex-wrap items-center gap-1.5"
        >
          <span className="text-xs text-muted-foreground">Calibrated for</span>
          {profileLabels(config, profile).map((label) => (
            <span
              key={label}
              className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/75"
            >
              {label}
            </span>
          ))}
        </motion.div>

        <motion.div variants={item} className="mt-10 grid gap-4 md:grid-cols-2">
          <Email card={payoff.before} />
          <Email card={payoff.after} featured />
        </motion.div>

        {/* Toolkit */}
        <motion.div variants={item} className="mt-14">
          <h3 className="font-display text-2xl tracking-tight">
            {payoff.toolkit.title}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {payoff.toolkit.subhead}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {payoff.toolkit.artifacts.map((artifact) => {
              const Icon = ARTIFACT_ICONS[artifact.kind];
              const isActive = artifact.id === activeArtifact.id;
              return (
                <button
                  key={artifact.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveArtifactId(artifact.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive
                      ? "border-primary/50 bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn("size-4", isActive && "text-primary")}
                    aria-hidden
                  />
                  {artifact.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeArtifact.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                    {activeArtifact.description}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyArtifact(activeArtifact)}
                  >
                    {copied === activeArtifact.id ? (
                      <Check
                        data-icon="inline-start"
                        className="text-reach"
                        aria-hidden
                      />
                    ) : (
                      <ClipboardCopy data-icon="inline-start" aria-hidden />
                    )}
                    {copied === activeArtifact.id ? "Copied" : "Copy"}
                  </Button>
                </div>
                <ArtifactPanel artifact={activeArtifact} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Export as Claude context */}
        <motion.div
          variants={item}
          className="mt-8 flex flex-col gap-5 rounded-2xl border border-primary/25 bg-accent/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-display text-lg tracking-tight">
                {payoff.exporting.title}
              </p>
              <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {payoff.exporting.body}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button className="h-10 px-4" onClick={() => void copyContextPack()}>
              {copied === "context-pack" ? (
                <Check data-icon="inline-start" aria-hidden />
              ) : (
                <ClipboardCopy data-icon="inline-start" aria-hidden />
              )}
              {copied === "context-pack" ? "Copied" : payoff.exporting.copyLabel}
            </Button>
            <Button
              variant="outline"
              className="h-10 bg-card px-4"
              onClick={downloadContextPack}
            >
              <Download data-icon="inline-start" aria-hidden />
              {payoff.exporting.downloadLabel}
            </Button>
          </div>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-8 flex flex-col items-start justify-between gap-6 rounded-2xl border border-reach/25 bg-reach-soft/60 p-5 sm:flex-row sm:items-center sm:p-6"
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
