"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/storage-supabase";
import { useFlowStore } from "@/lib/store";

/**
 * Sign-in gate. Email/password accounts via Supabase Auth when configured
 * (sign in from any device to get your modules back); a device-local
 * profile otherwise.
 */
export function Welcome() {
  const signIn = useFlowStore((s) => s.signIn);
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready =
    email.trim().includes("@") &&
    password.length >= 6 &&
    (mode === "signin" || name.trim());

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn({
        mode,
        name: name.trim() || undefined,
        email: email.trim(),
        password,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-ring/60";

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
          <div
            role="tablist"
            aria-label="Sign in or create account"
            className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium"
          >
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Create account"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={
                  mode === value
                    ? "rounded-md bg-card px-3 py-1.5 shadow-sm"
                    : "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {mode === "signup" && (
              <label className="block">
                <span className="text-sm font-semibold">Your name</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rayyan Darugar"
                  aria-label="Your name"
                  className={inputClass}
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-semibold">Email</span>
              <input
                autoFocus={mode === "signin"}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                aria-label="Password"
                className={inputClass}
              />
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-risk">
              {error}
            </p>
          )}

          <Button
            size="lg"
            className="mt-4 h-11 w-full"
            disabled={!ready || busy}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
            ) : null}
            {mode === "signin" ? "Sign in" : "Create my account"}
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Button>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          {isSupabaseConfigured()
            ? "Sign in from any device to pick up your modules and progress."
            : "Demo sign-in — your profile and progress are saved on this device."}
        </p>
      </motion.div>
    </div>
  );
}
