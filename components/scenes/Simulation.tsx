"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Bell,
  ChevronRight,
  CircleHelp,
  Lock,
  Rocket,
  Search,
} from "lucide-react";
import { Assistant } from "@/components/ui/Assistant";
import { Slider } from "@/components/ui/slider";
import { projectionForCap } from "@/lib/content";
import { useFlowStore, useVertical } from "@/lib/store";
import { cn } from "@/lib/utils";

function ForecastBar({
  label,
  pct,
  warnBelow,
}: {
  label: string;
  pct: number;
  warnBelow: number;
}) {
  const warn = pct < warnBelow;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-sim-muted">{label}</span>
        <span
          className={cn(
            "font-mono text-xs font-semibold tabular-nums",
            warn ? "text-amber-400" : "text-emerald-400"
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sim-bg">
        <motion.div
          className={cn(
            "h-full rounded-full",
            warn ? "bg-amber-400/80" : "bg-emerald-400/80"
          )}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        />
      </div>
    </div>
  );
}

const fmt = new Intl.NumberFormat("en-US");
const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function FieldLabel({
  children,
  locked,
}: {
  children: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-sim-muted uppercase">
      {children}
      {locked && <Lock className="size-3 opacity-70" aria-hidden />}
    </span>
  );
}

export function Simulation() {
  const launchSimulation = useFlowStore((s) => s.launchSimulation);
  const stored = useFlowStore((s) => s.choices);
  const runCount = useFlowStore((s) => s.runCount);
  const reduceMotion = useReducedMotion();

  const vertical = useVertical();
  const sim = vertical.simulation;
  const { campaign } = sim;

  const [frequencyCap, setFrequencyCap] = useState(stored.frequencyCap);
  const [priority, setPriority] = useState(stored.priority);

  const projection = projectionForCap(vertical, frequencyCap);

  return (
    <section className="flex flex-1 flex-col bg-sim-bg text-sim-text">
      {/* Environment ribbon — the one honest seam in the fiction */}
      <div className="border-b border-sim-border bg-sim-surface/60">
        <div className="mx-auto flex h-9 w-full max-w-7xl items-center gap-2 px-4 sm:px-6">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sim-accent opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-sim-accent" />
          </span>
          <span className="font-mono text-[0.68rem] tracking-[0.14em] text-sim-muted uppercase">
            {sim.environmentLabel}
            {runCount > 0 && ` · attempt ${runCount + 1}`}
          </span>
        </div>
      </div>

      {/* Product header bar */}
      <div className="border-b border-sim-border bg-sim-surface">
        <div className="mx-auto flex h-13 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-6 items-center justify-center rounded-md bg-sim-accent/20">
              <BarChart3 className="size-3.5 text-sim-accent" aria-hidden />
            </span>
            {sim.productName}
          </span>
          <div className="hidden flex-1 items-center md:flex">
            <div className="flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border border-sim-border bg-sim-bg/60 px-3 text-sm text-sim-muted">
              <Search className="size-3.5" aria-hidden />
              Search line items…
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3 text-sim-muted">
            <Bell className="size-4" aria-hidden />
            <CircleHelp className="size-4" aria-hidden />
            <span className="flex size-7 items-center justify-center rounded-full bg-sim-accent/25 text-xs font-semibold text-sim-accent">
              CM
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Sidebar — set dressing, deliberately inert */}
        <aside
          aria-hidden
          className="hidden w-52 shrink-0 border-r border-sim-border bg-sim-surface/40 py-5 lg:block"
        >
          {sim.nav.map((section) => (
            <div key={section.section} className="mb-5 px-3">
              <p className="px-2 pb-1.5 font-mono text-[0.62rem] tracking-[0.16em] text-sim-muted/70 uppercase">
                {section.section}
              </p>
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2 py-1.5 text-sm",
                    item.active
                      ? "bg-sim-accent/15 font-medium text-sim-text"
                      : "text-sim-muted"
                  )}
                >
                  {item.label}
                  {item.badge && (
                    <span className="rounded-full bg-risk/25 px-1.5 py-px font-mono text-[0.62rem] text-amber-400">
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* Main work area */}
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-1 text-xs text-sim-muted"
          >
            {sim.breadcrumb.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" aria-hidden />}
                <span
                  className={
                    i === sim.breadcrumb.length - 1 ? "text-sim-text" : ""
                  }
                >
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="max-w-3xl rounded-2xl border border-sim-border bg-sim-surface shadow-xl shadow-black/25"
          >
            <div className="border-b border-sim-border p-5 sm:p-6">
              <h2 className="text-lg font-semibold tracking-tight">
                {sim.taskTitle}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-sim-muted">
                {sim.taskBrief}
              </p>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {/* Contract fields — locked */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel locked>Line item name</FieldLabel>
                  <div className="mt-1.5 truncate rounded-lg border border-sim-border bg-sim-bg/50 px-3 py-2 font-mono text-sm text-sim-text/80">
                    {campaign.lineItemName}
                  </div>
                </div>
                <div>
                  <FieldLabel locked>Total budget</FieldLabel>
                  <div className="mt-1.5 rounded-lg border border-sim-border bg-sim-bg/50 px-3 py-2 font-mono text-sm text-sim-text/80">
                    {money.format(campaign.budget)}
                    <span className="ml-2 text-xs text-sim-muted">
                      @ ${campaign.cpm.toFixed(2)} CPM
                    </span>
                  </div>
                </div>
                <div>
                  <FieldLabel>Impressions goal</FieldLabel>
                  <div className="mt-1.5 rounded-lg border border-sim-border bg-sim-bg/50 px-3 py-2 font-mono text-sm text-sim-text/80">
                    {fmt.format(campaign.impressionsGoal)}
                    <span className="ml-2 text-xs text-sim-muted">
                      {campaign.flight}
                    </span>
                  </div>
                </div>
              </div>

              {/* Frequency cap — the decision */}
              <div className="rounded-xl border border-sim-accent/30 bg-sim-accent/[0.06] p-4 sm:p-5">
                <div className="flex items-baseline justify-between gap-4">
                  <label
                    htmlFor="frequency-cap"
                    className="text-sm font-semibold text-sim-text"
                  >
                    {sim.frequencyCap.label}
                  </label>
                  <span className="font-mono text-2xl font-semibold text-sim-accent tabular-nums">
                    {frequencyCap}
                    <span className="ml-1.5 text-xs font-normal text-sim-muted">
                      {sim.frequencyCap.unit}
                    </span>
                  </span>
                </div>
                <div className="mt-4">
                  <Slider
                    id="frequency-cap"
                    aria-label={sim.frequencyCap.label}
                    min={sim.frequencyCap.min}
                    max={sim.frequencyCap.max}
                    step={1}
                    value={[frequencyCap]}
                    onValueChange={(v) =>
                      setFrequencyCap(Array.isArray(v) ? v[0] : v)
                    }
                    className="**:data-[slot=slider-range]:bg-sim-accent **:data-[slot=slider-track]:bg-sim-bg **:data-[slot=slider-thumb]:border-sim-accent"
                  />
                  <div className="mt-1.5 flex justify-between font-mono text-[0.65rem] text-sim-muted">
                    <span>{sim.frequencyCap.min}</span>
                    <span>{sim.frequencyCap.max}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-sim-muted">
                  {sim.frequencyCap.helper}
                </p>

                {/* Live forecast — reacts to the slider */}
                <div className="mt-4 rounded-lg border border-sim-border bg-sim-bg/60 p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[0.65rem] tracking-[0.14em] text-sim-muted uppercase">
                      {sim.forecast.label}
                    </p>
                    <p className="font-mono text-[0.65rem] text-sim-muted">
                      avg. freq {projection.avgFrequency.toFixed(1)}/user
                    </p>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <ForecastBar
                      label="Unique reach"
                      pct={projection.reachPct}
                      warnBelow={70}
                    />
                    <ForecastBar
                      label="Budget delivery"
                      pct={projection.deliveryPct}
                      warnBelow={100}
                    />
                  </div>
                  <p className="mt-2.5 text-[0.65rem] leading-relaxed text-sim-muted/80">
                    {sim.forecast.disclaimer}
                  </p>
                </div>
              </div>

              {/* Priority */}
              <fieldset>
                <legend className="text-sm font-semibold">
                  {sim.priority.label}
                </legend>
                <p className="mt-0.5 text-xs text-sim-muted">
                  {sim.priority.helper}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {sim.priority.options.map((opt) => {
                    const selected = priority === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPriority(opt.value)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-sim-accent focus-visible:outline-none",
                          selected
                            ? "border-sim-accent/60 bg-sim-accent/10"
                            : "border-sim-border bg-sim-bg/40 hover:border-sim-muted/40"
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm font-medium",
                            selected ? "text-sim-text" : "text-sim-text/80"
                          )}
                        >
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug text-sim-muted">
                          {opt.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-sim-border p-5 sm:px-6">
              <p className="hidden text-xs text-sim-muted sm:block">
                Delivery settings can be edited after launch — reputations
                can&apos;t.
              </p>
              <button
                type="button"
                onClick={() => launchSimulation({ frequencyCap, priority })}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-sim-accent px-5 text-sm font-semibold text-[#0c0f1d] transition-all hover:bg-[#8aa2ff] focus-visible:ring-2 focus-visible:ring-sim-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sim-surface focus-visible:outline-none active:translate-y-px"
              >
                <Rocket className="size-4" aria-hidden />
                {sim.launchLabel}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <Assistant
        verticalId={vertical.id}
        scene="simulation"
        buttonLabel={vertical.assistant.buttonLabel}
        getContext={() => ({ frequencyCap, priority })}
      />
    </section>
  );
}
