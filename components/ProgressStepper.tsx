"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PHASES, phaseForScene } from "@/lib/content";
import { useCurrentScene, useFlowStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BookOpen, Check, LogOut } from "lucide-react";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AccountChip() {
  const user = useFlowStore((s) => s.user);
  const signOut = useFlowStore((s) => s.signOut);
  const openDashboard = useFlowStore((s) => s.openDashboard);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.name}`}
        className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {initials(user.name) || "?"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-10 right-0 z-50 w-48 origin-top-right rounded-xl border border-border bg-card p-1.5 shadow-lg"
          >
            <p className="truncate px-2.5 py-1.5 text-sm font-semibold">
              {user.name}
            </p>
            <p className="truncate px-2.5 pb-1.5 text-xs text-muted-foreground">
              {user.email ?? "Progress saved automatically"}
            </p>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                openDashboard();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <BookOpen className="size-3.5" aria-hidden />
              My modules
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <LogOut className="size-3.5" aria-hidden />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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

        <div className="flex items-center gap-3 sm:gap-4">
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
        <AccountChip />
        </div>
      </div>
    </header>
  );
}
