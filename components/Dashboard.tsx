"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storage, type SavedModule } from "@/lib/storage";
import { useCurrentScene, useFlowStore } from "@/lib/store";
import { phaseForScene, PHASES } from "@/lib/content";

/**
 * Module library dashboard — the landing screen for a signed-in user.
 * Reopen a saved module, continue an in-flight session, or start fresh.
 */
export function Dashboard() {
  const user = useFlowStore((s) => s.user);
  const setVertical = useFlowStore((s) => s.setVertical);
  const goTo = useFlowStore((s) => s.goTo);
  const closeDashboard = useFlowStore((s) => s.closeDashboard);
  const scene = useCurrentScene();
  const reduceMotion = useReducedMotion();
  const [modules, setModules] = useState<SavedModule[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void storage
      .listModules()
      .then(setModules)
      .finally(() => setLoaded(true));
  }, []);

  const midSession = scene !== "intro";
  const phaseLabel = PHASES.find((p) => p.id === phaseForScene(scene))?.label;

  const openModule = (m: SavedModule) => {
    setVertical(m.vertical, { coreId: m.coreId ?? null });
    goTo("lesson");
    closeDashboard();
  };

  const removeModule = async (id: string) => {
    setModules((mods) => mods.filter((m) => m.id !== id));
    await storage.deleteModule(id);
  };

  const startNew = () => {
    goTo("intro");
    closeDashboard();
  };

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6"
    >
      <p className="text-sm text-muted-foreground">Your module library</p>
      <h1 className="mt-1 font-display text-3xl tracking-tight">
        Welcome back, {firstName}.
      </h1>

      {midSession && (
        <button
          type="button"
          onClick={closeDashboard}
          className="mt-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-accent/60 p-5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <div className="flex items-center gap-3">
            <Play className="size-5 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Continue where you left off</p>
              <p className="text-sm text-muted-foreground">
                You&apos;re mid-session{phaseLabel ? ` in ${phaseLabel}` : ""}.
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      )}

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="size-4 text-muted-foreground" aria-hidden />
            Saved modules
          </h2>
          <Button size="sm" className="h-9 px-3" onClick={startNew}>
            <Plus data-icon="inline-start" aria-hidden />
            New module
          </Button>
        </div>

        {!loaded ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : modules.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No saved modules yet. Generate your first one — it&apos;ll be
              waiting here next time you sign in.
            </p>
            <Button className="mt-4 h-10 px-4" onClick={startNew}>
              Start your first module
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {modules.map((m) => (
              <li
                key={m.id}
                className="group relative rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <button
                  type="button"
                  onClick={() => openModule(m)}
                  className="w-full text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <p className="pr-6 font-medium">
                    {m.industry} — {m.role}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    for {m.productName} ·{" "}
                    {new Date(m.createdAt).toLocaleDateString()}
                    {m.source === "mock" && " · demo"}
                    {m.source === "cached" && " · reused core"}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Open module
                    <ArrowRight className="size-3" aria-hidden />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void removeModule(m.id)}
                  aria-label={`Delete saved module ${m.industry} — ${m.role}`}
                  className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-risk focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}
