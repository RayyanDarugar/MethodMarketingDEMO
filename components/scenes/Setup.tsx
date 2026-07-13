"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CircleAlert,
  History,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activeVertical,
  type ConfigQuestion,
  type Vertical,
} from "@/lib/content";
import type {
  GeneratedFoundation,
  GeneratedSimulation,
} from "@/lib/generation/schema";
import { storage, type SavedModule } from "@/lib/storage";
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50"
      />
    </label>
  );
}

type GenState =
  | { status: "idle" }
  | { status: "running"; label: string; startedAt: number; elapsedMs: number }
  | { status: "error"; message: string };

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `· ${m}m ${s.toString().padStart(2, "0")}s` : `· ${s}s`;
}

/**
 * Parse a response body defensively: platform error pages (function
 * timeouts, gateway errors) are plain text, and res.json() on them produces
 * the cryptic "Unexpected token 'A'…". Surface a human message instead.
 */
async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `The server stopped responding mid-generation (HTTP ${res.status}) — usually a platform timeout. Try again; if it repeats, generate this module once from a local dev server.`
    );
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await safeJson<T & { error?: string }>(res);
  if (!res.ok) {
    const err = new Error(data.error ?? `Request failed (HTTP ${res.status}).`);
    (err as Error & { payload?: unknown; status?: number }).payload = data;
    (err as Error & { payload?: unknown; status?: number }).status = res.status;
    throw err;
  }
  return data;
}

export function Setup() {
  const next = useFlowStore((s) => s.next);
  const profile = useFlowStore((s) => s.profile);
  const setVertical = useFlowStore((s) => s.setVertical);
  const reduceMotion = useReducedMotion();
  const { config } = activeVertical;

  const [mode, setMode] = useState<"builtin" | "custom">("builtin");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [gen, setGen] = useState<GenState>({ status: "idle" });
  const [savedModules, setSavedModules] = useState<SavedModule[]>([]);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void storage.listModules().then(setSavedModules);
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
  }, []);

  const reopenModule = (m: SavedModule) => {
    setVertical(m.vertical, { coreId: m.coreId ?? null });
    next();
  };

  const removeModule = async (id: string) => {
    setSavedModules((mods) => mods.filter((m) => m.id !== id));
    await storage.deleteModule(id);
  };

  const customReady =
    productName.trim() &&
    productDescription.trim() &&
    targetIndustry.trim() &&
    targetRole.trim();

  const generate = async () => {
    const startedAt = Date.now();
    const stage = (label: string) =>
      setGen((g) => ({
        status: "running",
        label,
        startedAt,
        elapsedMs: g.status === "running" ? g.elapsedMs : 0,
      }));
    stage("Checking the module library…");
    // Tick the elapsed counter once a second; Date.now() is read here (an
    // effect), not during render.
    stageTimer.current = setInterval(() => {
      setGen((g) =>
        g.status === "running"
          ? { ...g, elapsedMs: Date.now() - g.startedAt }
          : g
      );
    }, 1000);

    interface GenerateResult {
      vertical?: Vertical;
      warnings?: string[];
      source?: "model" | "mock" | "cached";
      coreId?: string | null;
      seed?: boolean;
    }

    const request = {
      product: {
        name: productName.trim(),
        description: productDescription.trim(),
      },
      targetIndustry: targetIndustry.trim(),
      targetRole: targetRole.trim(),
      profile,
    };

    try {
      let result = await postJson<GenerateResult>("/api/generate", request);

      if (result.seed) {
        // Cache miss: run the chunked seed flow — three short calls, each
        // safe against serverless time limits.
        stage("Drafting the lesson & briefing… (step 1 of 3)");
        let { foundation } = await postJson<{
          foundation: GeneratedFoundation;
        }>("/api/generate/section", { section: 1, request });

        stage("Parameterizing the simulation… (step 2 of 3)");
        let { simulation } = await postJson<{
          simulation: GeneratedSimulation;
        }>("/api/generate/section", { section: 2, request, foundation });

        stage("Writing your artifacts… (step 3 of 3)");
        for (let attempt = 1; ; attempt++) {
          try {
            result = await postJson<GenerateResult>("/api/generate/finish", {
              request,
              foundation,
              simulation,
            });
            break;
          } catch (err) {
            const { status, payload } = err as Error & {
              status?: number;
              payload?: { section?: 1 | 2 };
            };
            // Cross-section validation miss (rare): regenerate the
            // offending section once, then finish again.
            if (status !== 422 || !payload?.section || attempt > 1) throw err;
            if (payload.section === 1) {
              stage("Reworking the lesson & briefing…");
              ({ foundation } = await postJson<{
                foundation: GeneratedFoundation;
              }>("/api/generate/section", { section: 1, request }));
            } else {
              stage("Reworking the simulation…");
              ({ simulation } = await postJson<{
                simulation: GeneratedSimulation;
              }>("/api/generate/section", { section: 2, request, foundation }));
            }
            stage("Writing your artifacts… (step 3 of 3)");
          }
        }
      }

      if (!result.vertical) {
        throw new Error("Generation failed.");
      }
      if (result.warnings?.length) {
        console.info("[generation]", result.warnings.join("\n"));
      }
      // Save to the module library so it can be reopened without regenerating.
      void storage.saveModule({
        id: result.vertical.id,
        industry: result.vertical.industry,
        role: result.vertical.role,
        productName: productName.trim(),
        source: result.source ?? "mock",
        coreId: result.coreId ?? null,
        createdAt: new Date().toISOString(),
        vertical: result.vertical,
      });
      setVertical(result.vertical, { coreId: result.coreId ?? null });
      next();
    } catch (error) {
      setGen({
        status: "error",
        message:
          error instanceof Error ? error.message : "Generation failed.",
      });
    } finally {
      if (stageTimer.current) clearInterval(stageTimer.current);
    }
  };

  const generating = gen.status === "running";

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

          {/* Target module */}
          <fieldset>
            <legend className="text-sm font-semibold">
              What should this session teach?
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                role="radio"
                aria-checked={mode === "builtin"}
                onClick={() => setMode("builtin")}
                disabled={generating}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
                  mode === "builtin"
                    ? "border-primary/50 bg-accent"
                    : "border-border bg-card hover:border-primary/35"
                )}
              >
                <span className="text-sm font-medium">
                  {activeVertical.industry} — {activeVertical.role}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Expert-authored module, ready now
                </span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === "custom"}
                onClick={() => setMode("custom")}
                disabled={generating}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50",
                  mode === "custom"
                    ? "border-primary/50 bg-accent"
                    : "border-border bg-card hover:border-primary/35"
                )}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Wand2 className="size-3.5 text-primary" aria-hidden />
                  Custom — generate for my target
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Any industry, any role, built around your product
                </span>
              </button>
            </div>

            {savedModules.length > 0 && (
              <div className="mt-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <History className="size-3.5" aria-hidden />
                  Your saved modules
                </p>
                <ul className="mt-2 space-y-1.5">
                  {savedModules.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => reopenModule(m)}
                        disabled={generating}
                        className="flex-1 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                      >
                        <span className="text-sm font-medium">
                          {m.industry} — {m.role}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          for {m.productName} ·{" "}
                          {new Date(m.createdAt).toLocaleDateString()}
                          {m.source === "mock" && " · demo"}
                          {m.source === "cached" && " · reused core"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeModule(m.id)}
                        aria-label={`Delete saved module ${m.industry} — ${m.role}`}
                        className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:text-risk focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <AnimatePresence initial={false}>
              {mode === "custom" && (
                <motion.div
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <TextField
                      label="Your product"
                      value={productName}
                      onChange={setProductName}
                      placeholder="e.g. Kana Agents"
                      disabled={generating}
                    />
                    <TextField
                      label="What it does (one line)"
                      value={productDescription}
                      onChange={setProductDescription}
                      placeholder="e.g. Custom AI agents on your existing stack"
                      disabled={generating}
                    />
                    <TextField
                      label="Target industry"
                      value={targetIndustry}
                      onChange={setTargetIndustry}
                      placeholder="e.g. Logistics / Freight"
                      disabled={generating}
                    />
                    <TextField
                      label="Target role"
                      value={targetRole}
                      onChange={setTargetRole}
                      placeholder="e.g. Freight Dispatcher"
                      disabled={generating}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </fieldset>
        </motion.div>

        <motion.div variants={item} className="mt-6">
          {mode === "builtin" ? (
            <Button size="lg" className="h-11 px-6" onClick={next}>
              {config.cta}
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
          ) : generating ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-accent/50 px-4 py-3">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
              <AnimatePresence mode="wait">
                <motion.span
                  key={gen.status === "running" ? gen.label : "done"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-medium"
                  role="status"
                >
                  {gen.status === "running"
                    ? `${gen.label} ${formatElapsed(gen.elapsedMs)}`
                    : "Almost there…"}
                </motion.span>
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-11 px-6"
                disabled={!customReady}
                onClick={() => void generate()}
              >
                <Sparkles data-icon="inline-start" aria-hidden />
                Generate my module
              </Button>
              {gen.status === "error" && (
                <p className="flex items-center gap-1.5 text-sm text-risk" role="alert">
                  <CircleAlert className="size-4 shrink-0" aria-hidden />
                  {gen.message}
                </p>
              )}
            </div>
          )}
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
            {config.note}
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
