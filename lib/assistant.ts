import { type SceneId } from "@/lib/content";
import { getVertical } from "@/lib/verticals";

/**
 * The seam between conversational UI and whatever produces answers.
 *
 * v1 resolves everything from scripted content in content.ts, with a little
 * artificial latency so the interaction reads honestly as "asking". A later
 * version swaps these providers for ones that call a model API — the
 * components and these interfaces stay unchanged.
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Simulation hints ("I'm stuck")
// ---------------------------------------------------------------------------

export interface AssistantRequest {
  verticalId: string;
  scene: SceneId;
  /** Whatever the scene knows that a model would want (current field values, etc.). */
  context?: Record<string, unknown>;
  /** How many hints the user has already seen, so escalation is possible. */
  hintIndex: number;
}

export interface AssistantMessage {
  id: string;
  text: string;
  /** True when there is a further hint to escalate to. */
  hasMore: boolean;
}

export type HintProvider = (req: AssistantRequest) => Promise<AssistantMessage>;

export const scriptedHintProvider: HintProvider = async (req) => {
  const vertical = getVertical(req.verticalId);
  const lines = vertical?.assistant.lines ?? [];
  const index = Math.min(req.hintIndex, lines.length - 1);
  await delay(500);
  return {
    id: `${req.verticalId}-hint-${index}`,
    text: lines[index] ?? "You've got this — trust what the lesson told you.",
    hasMore: index < lines.length - 1,
  };
};

/** The provider the app currently uses. Swap here when hints go live. */
export const hintProvider: HintProvider = scriptedHintProvider;

// ---------------------------------------------------------------------------
// Lesson-card follow-up questions ("Ask the coach")
// ---------------------------------------------------------------------------

export interface CardQuestionRequest {
  verticalId: string;
  cardId: string;
  question: string;
}

export interface CardAnswer {
  id: string;
  text: string;
}

export type CardQuestionProvider = (
  req: CardQuestionRequest
) => Promise<CardAnswer>;

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "what", "whats", "who", "how",
  "does", "do", "is", "are", "was", "were", "it", "its", "that", "this",
  "for", "with", "you", "your", "can", "about", "of", "in", "on", "to",
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Scripted stand-in for a model call: match the user's question against the
 * card's scripted follow-ups by keyword overlap; fall back to the card's
 * graceful default when nothing matches.
 */
export const scriptedCardQuestionProvider: CardQuestionProvider = async (
  req
) => {
  const vertical = getVertical(req.verticalId);
  const card = vertical?.lesson.cards.find((c) => c.id === req.cardId);
  await delay(600 + Math.random() * 500);

  if (!card) {
    return { id: `${req.cardId}-none`, text: "Hmm — try another card." };
  }

  const asked = new Set(keywords(req.question));
  let best: { score: number; answer: string; index: number } | null = null;

  for (const [index, fu] of card.followUps.entries()) {
    const candidate = keywords(`${fu.question} ${fu.answer}`);
    const score = candidate.filter((w) => asked.has(w)).length;
    if (score >= 2 && (!best || score > best.score)) {
      best = { score, answer: fu.answer, index };
    }
  }

  return best
    ? { id: `${req.cardId}-match-${best.index}`, text: best.answer }
    : { id: `${req.cardId}-fallback`, text: card.fallbackAnswer };
};

/** The provider the app currently uses. Swap here when card Q&A goes live. */
export const cardQuestionProvider: CardQuestionProvider =
  scriptedCardQuestionProvider;
