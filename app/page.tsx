"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ProgressStepper } from "@/components/ProgressStepper";
import { Intro } from "@/components/scenes/Intro";
import { Lesson } from "@/components/scenes/Lesson";
import { Simulation } from "@/components/scenes/Simulation";
import { Outcome } from "@/components/scenes/Outcome";
import { Payoff } from "@/components/scenes/Payoff";
import { useCurrentScene } from "@/lib/store";
import type { SceneId } from "@/lib/content";

const SCENES: Record<SceneId, React.ComponentType> = {
  intro: Intro,
  lesson: Lesson,
  simulation: Simulation,
  outcome: Outcome,
  payoff: Payoff,
};

export default function Home() {
  const scene = useCurrentScene();
  const reduceMotion = useReducedMotion();
  const ActiveScene = SCENES[scene];

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
