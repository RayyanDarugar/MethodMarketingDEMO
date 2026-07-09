"use client";

import { useState } from "react";
import { useFlowStore } from "@/lib/store";

/**
 * Learner feedback. SceneThumbs = one-tap ±1 on a scene; CompletionFeedback =
 * 1-5 rating + optional comment on the payoff completion card. Rows attribute
 * to the module and (when generated from the cache path) its core, which
 * gates future cache reuse.
 */

type ThumbScene = "lesson" | "simulation" | "payoff";

async function postFeedback(body: {
  scene: ThumbScene | "overall";
  score: number;
  comment?: string;
  moduleId: string;
  coreId: string | null;
  userId: string | null;
}) {
  try {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Feedback is best-effort; never interrupt the flow.
  }
}

function useFeedbackMeta() {
  const vertical = useFlowStore((s) => s.vertical);
  const coreId = useFlowStore((s) => s.coreId);
  const user = useFlowStore((s) => s.user);
  return { moduleId: vertical.id, coreId, userId: user?.id ?? null };
}

export function SceneThumbs({ scene }: { scene: ThumbScene }) {
  const meta = useFeedbackMeta();
  const [sent, setSent] = useState<1 | -1 | null>(null);

  const send = (score: 1 | -1) => {
    if (sent) return;
    setSent(score);
    void postFeedback({ scene, score, ...meta });
  };

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {sent ? (
        <span>Thanks for the feedback</span>
      ) : (
        <>
          <span>Was this section useful?</span>
          <button
            type="button"
            aria-label="Thumbs up"
            onClick={() => send(1)}
            className="rounded px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            👍
          </button>
          <button
            type="button"
            aria-label="Thumbs down"
            onClick={() => send(-1)}
            className="rounded px-1.5 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            👎
          </button>
        </>
      )}
    </div>
  );
}

export function CompletionFeedback() {
  const meta = useFeedbackMeta();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!rating || done) return;
    setDone(true);
    void postFeedback({
      scene: "overall",
      score: rating,
      comment: comment.trim() || undefined,
      ...meta,
    });
  };

  if (done) {
    return (
      <p className="text-xs text-muted-foreground">
        Thanks — your feedback improves future modules.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Rate this module:</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={
              n <= rating
                ? "text-base"
                : "text-base opacity-30 transition-opacity hover:opacity-70"
            }
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was off? (optional)"
            rows={2}
            className="rounded border border-border bg-transparent p-2 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            className="self-start rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Send feedback
          </button>
        </>
      )}
    </div>
  );
}
