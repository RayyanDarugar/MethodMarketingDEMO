"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/storage-supabase";
import { useFlowStore } from "@/lib/store";

/**
 * Demo sign-in gate. Name-based identity today; the storage adapter decides
 * where the profile lives (Supabase when configured, this device otherwise).
 * Real auth replaces this screen behind the same signIn seam.
 */
export function Welcome() {
  const signIn = useFlowStore((s) => s.signIn);
  const reduceMotion = useReducedMotion();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await signIn(name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 right-1/4 -z-10 size-[26rem] rounded-full bg-[radial-gradient(closest-side,var(--accent),transparent)] opacity-70"
      />
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-sm"
      >
        <p className="text-center font-display text-2xl tracking-tight">
          Method<span className="text-primary">*</span>
          <span className="text-muted-foreground"> Marketing</span>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Learn the role. Run the job. Produce like an insider.
        </p>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6">
          <label className="block">
            <span className="text-sm font-semibold">
              Who&apos;s stepping into the role?
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              placeholder="Your name"
              aria-label="Your name"
              className="mt-2.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          </label>
          <Button
            size="lg"
            className="mt-4 h-11 w-full"
            disabled={!name.trim() || busy}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
            ) : null}
            Start my session
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          {isSupabaseConfigured()
            ? "Your profile, progress, and generated modules are saved to your account."
            : "Demo sign-in — your profile and progress are saved on this device."}
        </p>
      </motion.div>
    </div>
  );
}
