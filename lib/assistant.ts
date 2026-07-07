import { VERTICALS, type SceneId } from "@/lib/content";

/**
 * The seam between the Assistant UI and whatever produces hints.
 *
 * v1 resolves hints from the scripted lines in content.ts. A later version
 * swaps `scriptedHintProvider` for one that calls a model API — the Assistant
 * component and this interface stay unchanged.
 */

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

export type HintProvider = (
  req: AssistantRequest
) => Promise<AssistantMessage>;

export const scriptedHintProvider: HintProvider = async (req) => {
  const vertical = VERTICALS.find((v) => v.id === req.verticalId);
  const lines = vertical?.assistant.lines ?? [];
  const index = Math.min(req.hintIndex, lines.length - 1);
  return {
    id: `${req.verticalId}-hint-${index}`,
    text: lines[index] ?? "You've got this — trust what the lesson told you.",
    hasMore: index < lines.length - 1,
  };
};

/** The provider the app currently uses. Swap here when hints go live. */
export const hintProvider: HintProvider = scriptedHintProvider;
