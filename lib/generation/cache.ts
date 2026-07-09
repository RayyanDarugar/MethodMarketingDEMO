import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Vertical } from "@/lib/content";
import {
  normalizePair,
  stripPayoff,
  SCHEMA_VERSION,
  type VerticalCore,
} from "@/lib/generation/core";
import { isCoreBlocked, type FeedbackRow } from "@/lib/feedback/scoring";

/**
 * Global module-core cache (server-side). Every function degrades to a
 * cache miss / no-op on any failure: the cache saves money, it must never
 * cost a run.
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MATCHER_MODEL = "claude-haiku-4-5";
const CANDIDATE_CAP = 50;

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!URL_ENV || !KEY_ENV) return null;
  if (!client) client = createClient(URL_ENV, KEY_ENV);
  return client;
}

export interface CachedCore {
  id: string;
  industry: string;
  role: string;
  core: VerticalCore;
}

async function coreFeedback(
  db: SupabaseClient,
  coreId: string
): Promise<FeedbackRow[]> {
  const { data, error } = await db
    .from("mm_feedback")
    .select("scene, score")
    .eq("core_id", coreId);
  if (error) throw error;
  return (data ?? []) as FeedbackRow[];
}

export async function lookupCoreExact(
  industry: string,
  role: string
): Promise<CachedCore | null> {
  const db = supabase();
  if (!db) return null;
  try {
    const { industryNorm, roleNorm } = normalizePair(industry, role);
    const { data, error } = await db
      .from("mm_module_cores")
      .select("id, industry, role, core")
      .eq("industry_norm", industryNorm)
      .eq("role_norm", roleNorm)
      .eq("schema_version", SCHEMA_VERSION)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (isCoreBlocked(await coreFeedback(db, data.id))) {
      console.log(`[cache] core ${data.id} is feedback-blocked; regenerating`);
      return null;
    }
    return {
      id: data.id,
      industry: data.industry,
      role: data.role,
      core: data.core as VerticalCore,
    };
  } catch (error) {
    console.warn("[cache] exact lookup failed:", error);
    return null;
  }
}

export async function listCandidatePairs(): Promise<
  { industry: string; role: string }[]
> {
  const db = supabase();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("mm_module_cores")
      .select("id, industry, role")
      .eq("schema_version", SCHEMA_VERSION)
      .order("use_count", { ascending: false })
      .limit(CANDIDATE_CAP);
    if (error) throw error;
    const pairs: { industry: string; role: string }[] = [];
    for (const row of data ?? []) {
      if (!isCoreBlocked(await coreFeedback(db, row.id))) {
        pairs.push({ industry: row.industry, role: row.role });
      }
    }
    return pairs;
  } catch (error) {
    console.warn("[cache] candidate listing failed:", error);
    return [];
  }
}

export function parseMatcherReply(
  text: string,
  candidates: { industry: string; role: string }[]
): { industry: string; role: string } | null {
  const reply = text.trim().toLowerCase();
  if (/\bnone\b|\bno\b/.test(reply)) return null;
  const match = reply.match(/\d+/);
  if (!match) return null;
  const index = Number(match[0]) - 1;
  return candidates[index] ?? null;
}

export async function matchPair(
  industry: string,
  role: string,
  candidates: { industry: string; role: string }[]
): Promise<{ industry: string; role: string } | null> {
  if (candidates.length === 0) return null;
  try {
    const anthropic = new Anthropic({ maxRetries: 0 });
    const list = candidates
      .map((c, i) => `${i + 1}. ${c.industry} / ${c.role}`)
      .join("\n");
    const response = await anthropic.messages.create({
      model: MATCHER_MODEL,
      max_tokens: 16,
      system:
        "You match a requested industry/role pair against a list of existing learning modules. Reply with ONLY the number of a candidate that teaches essentially the same role in essentially the same industry (synonyms and phrasing differences are fine), or the word none. When unsure, reply none — a wrong match is worse than a miss.",
      messages: [
        {
          role: "user",
          content: `Requested: ${industry} / ${role}\n\nExisting modules:\n${list}`,
        },
      ],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const matched = parseMatcherReply(text, candidates);
    console.log(
      `[cache] matcher: "${industry} / ${role}" -> ${
        matched ? `"${matched.industry} / ${matched.role}"` : "none"
      }`
    );
    return matched;
  } catch (error) {
    console.warn("[cache] matcher failed; treating as no match:", error);
    return null;
  }
}

export async function saveCore(
  vertical: Vertical,
  industry: string,
  role: string
): Promise<string | null> {
  const db = supabase();
  if (!db) return null;
  try {
    const { industryNorm, roleNorm } = normalizePair(industry, role);
    const { data, error } = await db
      .from("mm_module_cores")
      .upsert(
        {
          industry,
          role,
          industry_norm: industryNorm,
          role_norm: roleNorm,
          core: stripPayoff(vertical),
          schema_version: SCHEMA_VERSION,
          use_count: 0,
        },
        { onConflict: "industry_norm,role_norm,schema_version" }
      )
      .select("id")
      .single();
    if (error) throw error;
    // A replaced core starts with a clean slate: detach old feedback so it
    // no longer gates (rows survive for review via module_id).
    await db
      .from("mm_feedback")
      .update({ core_id: null })
      .eq("core_id", data.id);
    console.log(`[cache] saved core ${data.id} for "${industry} / ${role}"`);
    return data.id;
  } catch (error) {
    console.warn("[cache] core save failed:", error);
    return null;
  }
}

export async function bumpUseCount(id: string): Promise<void> {
  const db = supabase();
  if (!db) return;
  try {
    const { data } = await db
      .from("mm_module_cores")
      .select("use_count")
      .eq("id", id)
      .single();
    await db
      .from("mm_module_cores")
      .update({ use_count: (data?.use_count ?? 0) + 1 })
      .eq("id", id);
  } catch {
    // Telemetry only — never worth failing over.
  }
}
