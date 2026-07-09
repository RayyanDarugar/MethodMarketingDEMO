import { describe, expect, it } from "vitest";
import { parseMatcherReply } from "@/lib/generation/cache";

const candidates = [
  { industry: "Fintech", role: "Account Executives" },
  { industry: "Healthcare", role: "Practice Managers" },
];

describe("parseMatcherReply", () => {
  it("resolves a bare index reply", () => {
    expect(parseMatcherReply("2", candidates)).toEqual(candidates[1]);
  });
  it("resolves an index inside prose", () => {
    expect(parseMatcherReply("Best match: 1", candidates)).toEqual(
      candidates[0]
    );
  });
  it("returns null for 'none', out-of-range, or garbage", () => {
    expect(parseMatcherReply("none", candidates)).toBeNull();
    expect(parseMatcherReply("0", candidates)).toBeNull();
    expect(parseMatcherReply("7", candidates)).toBeNull();
    expect(
      parseMatcherReply("no close match (see 1 above)", candidates)
    ).toBeNull();
  });
});
