"use client";

import { ScenarioPlayer } from "@/components/simulation/ScenarioPlayer";
import { useVertical } from "@/lib/store";

/**
 * Simulate scene: dispatches the vertical's archetype to its skin. Skins
 * wrap the shared ScenarioPlayer in archetype-specific chrome (ops
 * dashboard, deal desk CRM, studio review board); until a skin lands, the
 * unwrapped player renders.
 */
export function Simulation() {
  const vertical = useVertical();

  switch (vertical.simulation.archetype) {
    case "opsDashboard":
    case "dealDesk":
    case "studioBoard":
    default:
      return <ScenarioPlayer />;
  }
}
