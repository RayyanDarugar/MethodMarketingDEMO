import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * POST /api/feedback — store learner feedback. Thumbs (score ±1) on lesson /
 * simulation / payoff scenes; a 1-5 rating (+ optional comment) for scene
 * "overall". Rows with a core_id gate the module-core cache (see
 * lib/feedback/scoring.ts).
 */

const FeedbackSchema = z
  .object({
    moduleId: z.string().min(1),
    coreId: z.string().uuid().nullish(),
    userId: z.string().uuid().nullish(),
    scene: z.enum(["lesson", "simulation", "payoff", "overall"]),
    score: z.number().int(),
    comment: z.string().max(2000).nullish(),
  })
  .refine(
    (f) =>
      f.scene === "overall"
        ? f.score >= 1 && f.score <= 5
        : f.score === 1 || f.score === -1,
    { message: "score out of range for scene" }
  );

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid feedback.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Storage not configured." },
      { status: 503 }
    );
  }

  const { error } = await createClient(url, key).from("mm_feedback").insert({
    module_id: parsed.data.moduleId,
    core_id: parsed.data.coreId ?? null,
    user_id: parsed.data.userId ?? null,
    scene: parsed.data.scene,
    score: parsed.data.score,
    comment: parsed.data.comment ?? null,
  });
  if (error) {
    console.warn("[feedback] insert failed:", error);
    return NextResponse.json(
      { error: "Could not save feedback." },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true });
}
