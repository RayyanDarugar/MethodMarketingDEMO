"use client";

import type { ReactNode } from "react";
import {
  BadgeDollarSign,
  Bell,
  ChevronRight,
  CircleUser,
  Columns3,
  LayoutDashboard,
  Search,
} from "lucide-react";
import type { Archetype, ScenarioSimulation } from "@/lib/scenario/types";
import { cn } from "@/lib/utils";

/**
 * Archetype skins: chrome around the shared ScenarioPlayer plus the
 * archetype's voice for the numeric beat's risk chips. The tool must read
 * as its category (ad server / CRM quote console / proofing board) at a
 * glance — same engine underneath.
 */

export interface ArchetypeChrome {
  /** Wraps the whole player in archetype chrome. */
  Frame: (props: { sim: ScenarioSimulation; children: ReactNode }) => ReactNode;
  /** Chip when the pending numeric value would land the day in "high". */
  highRiskLabel: string;
  /** Chip when the pending numeric value would land the day in "low". */
  lowRiskLabel: string;
}

function OpsDashboardFrame({
  sim,
  children,
}: {
  sim: ScenarioSimulation;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-sim-border bg-sim-surface">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <LayoutDashboard className="size-4 text-sim-accent" aria-hidden />
            {sim.productName}
          </span>
          <span className="hidden items-center gap-2 rounded-md border border-sim-border px-2.5 py-1 text-xs text-sim-muted sm:flex">
            <Search className="size-3" aria-hidden />
            Search line items…
          </span>
          <span className="flex items-center gap-3 text-sim-muted">
            <Bell className="size-4" aria-hidden />
            <span className="flex size-6 items-center justify-center rounded-full bg-sim-accent/20 text-[10px] font-semibold text-sim-accent">
              CM
            </span>
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

const DEAL_STAGES = ["Discovery", "Demo", "Negotiation", "Contract"];

function DealDeskFrame({
  sim,
  children,
}: {
  sim: ScenarioSimulation;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <BadgeDollarSign className="size-4 text-primary" aria-hidden />
            {sim.productName}
          </span>
          <nav
            aria-label="Deal stage"
            className="hidden items-center overflow-hidden rounded-lg border border-border text-xs font-medium sm:flex"
          >
            {DEAL_STAGES.map((stage, i) => {
              const active = stage === "Negotiation";
              return (
                <span
                  key={stage}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5",
                    active
                      ? "bg-primary text-primary-foreground"
                      : i < DEAL_STAGES.indexOf("Negotiation")
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {stage}
                  {i < DEAL_STAGES.length - 1 && (
                    <ChevronRight className="size-3 opacity-50" aria-hidden />
                  )}
                </span>
              );
            })}
          </nav>
          <CircleUser className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </div>
      {children}
    </div>
  );
}

const BOARD_COLUMNS = [
  { label: "In design", count: 3 },
  { label: "Internal review", count: 2 },
  { label: "Client review", count: 4 },
  { label: "Approved", count: 7 },
];

function StudioBoardFrame({
  sim,
  children,
}: {
  sim: ScenarioSimulation;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <Columns3 className="size-4 text-primary" aria-hidden />
            {sim.productName}
          </span>
          <div className="hidden items-center gap-2 sm:flex">
            {BOARD_COLUMNS.map((col) => (
              <span
                key={col.label}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium",
                  col.label === "Client review" &&
                    "border-primary/40 bg-accent text-foreground"
                )}
              >
                {col.label}
                <span className="rounded-full bg-muted px-1.5 font-mono text-[10px]">
                  {col.count}
                </span>
              </span>
            ))}
          </div>
          <CircleUser className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </div>
      {children}
    </div>
  );
}

export const ARCHETYPE_CHROME: Record<Archetype, ArchetypeChrome> = {
  opsDashboard: {
    Frame: OpsDashboardFrame,
    highRiskLabel: "Fatigue territory — the budget starts buying repeats",
    lowRiskLabel: "Starvation territory — the plan can't spend at this setting",
  },
  dealDesk: {
    Frame: DealDeskFrame,
    highRiskLabel: "Exceeds guardrails — this quote routes to VP approval",
    lowRiskLabel: "Below the win zone — the deal likely slips at this number",
  },
  studioBoard: {
    Frame: StudioBoardFrame,
    highRiskLabel: "Past the healthy-rounds norm — margin and the team absorb it",
    lowRiskLabel: "Too rigid — the relationship takes the hit",
  },
};
