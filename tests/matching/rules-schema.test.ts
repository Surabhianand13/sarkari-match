import { describe, expect, it } from "vitest";
import { parsePostRules, rulesTemplate } from "@/lib/matching/rules-schema";

describe("post rules editor schema", () => {
  it("accepts the starter template and fills empty arrays for blank input", () => {
    expect(parsePostRules(rulesTemplate).ok).toBe(true);
    const blank = parsePostRules("");
    expect(blank.ok && blank.rules.ageRules).toEqual([]);
  });

  it("explains invalid JSON and invalid rule fields", () => {
    expect(parsePostRules("{ not json")).toEqual({ ok: false, message: "Eligibility rules must be valid JSON." });
    const bad = parsePostRules(JSON.stringify({ ageRules: [{ maximumAge: 27, cutoffDate: "not-a-date", ruleText: "Age limit" }] }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.message).toContain("ageRules.0.cutoffDate");
    expect(parsePostRules(JSON.stringify({ qualificationRules: [{ minimumLevel: "phd", mandatory: true, ruleText: "x y z" }] })).ok).toBe(false);
  });
});
