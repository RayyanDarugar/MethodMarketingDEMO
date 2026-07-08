import { VERTICALS, type Vertical } from "@/lib/content";

/**
 * Runtime vertical registry. Static verticals from content.ts are seeded at
 * module load; generated verticals are registered as they arrive. Non-React
 * code (e.g. the assistant providers) resolves verticals by id from here, so
 * scripted and generated content follow the same lookup path.
 */

const registry = new Map<string, Vertical>(VERTICALS.map((v) => [v.id, v]));

export function registerVertical(vertical: Vertical) {
  registry.set(vertical.id, vertical);
}

export function getVertical(id: string): Vertical | undefined {
  return registry.get(id);
}
