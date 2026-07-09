"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Dashboard } from "@/components/Dashboard";
import { ProgressStepper } from "@/components/ProgressStepper";
import { Welcome } from "@/components/Welcome";
import { Intro } from "@/components/scenes/Intro";
import { Setup } from "@/components/scenes/Setup";
import { Lesson } from "@/components/scenes/Lesson";
import { Briefing } from "@/components/scenes/Briefing";
import { Simulation } from "@/components/scenes/Simulation";
import { Outcome } from "@/components/scenes/Outcome";
import { Payoff } from "@/components/scenes/Payoff";
import { useCurrentScene, useFlowStore } from "@/lib/store";
import type { SceneId } from "@/lib/content";

const SCENES: Record<SceneId, React.ComponentType> = {
  intro: Intro,
  setup: Setup,
  lesson: Lesson,
  briefing: Briefing,
  simulation: Simulation,
  outcome: Outcome,
  payoff: Payoff,
};

export default function Home() {
  const scene = useCurrentScene();
  const hydrated = useFlowStore((s) => s.hydrated);
  const user = useFlowStore((s) => s.user);
  const showDashboard = useFlowStore((s) => s.showDashboard);
  const reduceMotion = useReducedMotion();
  const ActiveScene = SCENES[scene];

  useEffect(() => {
    void useFlowStore.getState().hydrate();
  }, []);

  if (!hydrated) {
    return <div className="min-h-dvh" aria-busy="true" />;
  }

  if (!user) {
    return <Welcome />;
  }

  if (showDashboard) {
    return (
      <div className="flex min-h-dvh flex-col">
        <ProgressStepper />
        <main className="flex flex-1 flex-col">
          <Dashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <ProgressStepper />
      <main className="flex flex-1 flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene}
            className="flex flex-1 flex-col"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
          >
            <ActiveScene />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
