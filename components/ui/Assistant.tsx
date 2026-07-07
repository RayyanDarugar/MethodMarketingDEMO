"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import {
  hintProvider,
  type AssistantMessage,
  type HintProvider,
} from "@/lib/assistant";
import type { SceneId } from "@/lib/content";
import { cn } from "@/lib/utils";

interface AssistantProps {
  verticalId: string;
  scene: SceneId;
  buttonLabel: string;
  /** Live scene state a future model-backed provider would want. */
  getContext?: () => Record<string, unknown>;
  /** Swappable hint source; defaults to the scripted provider. */
  provider?: HintProvider;
  className?: string;
}

/**
 * In-context helper. The UI only knows it asks a HintProvider for the next
 * message — pointing `provider` at a model API later changes nothing here.
 */
export function Assistant({
  verticalId,
  scene,
  buttonLabel,
  getContext,
  provider = hintProvider,
  className,
}: AssistantProps) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<AssistantMessage | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const requestHint = useCallback(
    async (index: number) => {
      setLoading(true);
      try {
        const msg = await provider({
          verticalId,
          scene,
          context: getContext?.(),
          hintIndex: index,
        });
        setMessage(msg);
        setHintIndex(index);
      } finally {
        setLoading(false);
      }
    },
    [provider, verticalId, scene, getContext]
  );

  const openPanel = () => {
    setOpen(true);
    void requestHint(0);
  };

  return (
    <div className={cn("pointer-events-none fixed right-5 bottom-5 z-50", className)}>
      <AnimatePresence>
        {open && (
          <motion.aside
            key="panel"
            role="status"
            aria-live="polite"
            initial={
              reduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 12, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }
            }
            transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
            className="pointer-events-auto mb-3 w-80 origin-bottom-right rounded-2xl border border-sim-border bg-sim-raised p-4 shadow-2xl shadow-black/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-sim-accent/20">
                  <Sparkles className="size-3.5 text-sim-accent" aria-hidden />
                </span>
                <span className="text-xs font-semibold tracking-wide text-sim-text">
                  Method coach
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Dismiss hint"
                className="rounded-md p-1 text-sim-muted transition-colors hover:text-sim-text focus-visible:ring-2 focus-visible:ring-sim-accent focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <p className="mt-3 min-h-10 text-sm leading-relaxed text-sim-text/90">
              {loading ? "…" : message?.text}
            </p>

            {message?.hasMore && !loading && (
              <button
                type="button"
                onClick={() => void requestHint(hintIndex + 1)}
                className="mt-3 text-xs font-medium text-sim-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-sim-accent focus-visible:outline-none"
              >
                Just tell me what a pro would do
              </button>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {!open && (
        <button
          type="button"
          onClick={openPanel}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-sim-border bg-sim-raised px-4 py-2.5 text-sm font-medium text-sim-text shadow-lg shadow-black/30 transition-colors hover:border-sim-accent/50 hover:text-white focus-visible:ring-2 focus-visible:ring-sim-accent focus-visible:outline-none"
        >
          <Sparkles className="size-4 text-sim-accent" aria-hidden />
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
