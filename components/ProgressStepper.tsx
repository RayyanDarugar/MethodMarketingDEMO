"use client";

import { motion } from "framer-motion";
import { PHASES, phaseForScene } from "@/lib/content";
import { useCurrentScene, useFlowStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function ProgressStepper() {
  const scene = useCurrentScene();
  const restart = useFlowStore((s) => s.restart);
  const activePhase = phaseForScene(scene);
  const activeIndex = PHASES.findIndex((p) => p.id === activePhase);
  const complete = scene === "payoff";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={restart}
          aria-label="Restart from the beginning"
          className="rounded-md font-display text-lg tracking-tight transition-opacity hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Method<span className="text-primary">*</span>
          <span className="text-muted-foreground"> Marketing</span>
        </button>

        <nav aria-label="Progress" className="flex items-center gap-1 sm:gap-2">
          {PHASES.map((phase, i) => {
            const state =
              i < activeIndex || (i === activeIndex && complete)
                ? "done"
                : i === activeIndex
                  ? "active"
                  : "todo";
            return (
              <div key={phase.id} className="flex items-center gap-1 sm:gap-2">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "h-px w-4 sm:w-8",
                      state === "todo" ? "bg-border" : "bg-primary/50"
                    )}
                  />
                )}
                <div
                  aria-current={state === "active" ? "step" : undefined}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm",
                    state === "active" && "text-primary",
                    state === "done" && "text-foreground",
                    state === "todo" && "text-muted-foreground"
                  )}
                >
                  {state === "active" && (
                    <motion.span
                      layoutId="phase-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    {state === "done" ? (
                      <Check className="size-3.5 text-reach" aria-hidden />
                    ) : (
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 rounded-full",
                          state === "active" ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                    {phase.label}
                  </span>
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
