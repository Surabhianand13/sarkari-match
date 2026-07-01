import { describe, expect, it } from "vitest";
import { ageOnCutoff, evaluateMatch } from "@/lib/matching/engine";
import type { PostRules } from "@/lib/matching/types";

const rules: PostRules = {
  ageRules: [{ category: "general", minimumAge: 18, maximumAge: 30, cutoffDate: "2026-08-01", ruleText: "Your age on 1 August 2026 is within the applicable limit." }],
  qualificationRules: [{ minimumLevel: "graduate", acceptedAnyDegree: true, mandatory: true, ruleText: "Any graduate accepted." }],
  experienceRules: [],
  otherRules: []
};

describe("matching engine", () => {
  it("calculates birthday before, on and after cutoff date", () => {
    expect(ageOnCutoff("1996-07-31", "2026-08-01")).toBe(30);
    expect(ageOnCutoff("1996-08-01", "2026-08-01")).toBe(30);
    expect(ageOnCutoff("1996-08-02", "2026-08-01")).toBe(29);
  });

  it("handles leap-year date of birth", () => {
    expect(ageOnCutoff("2000-02-29", "2026-02-28")).toBe(25);
  });

  it("returns strong match for any graduate qualification", () => {
    const result = evaluateMatch({ dateOfBirth: "1998-01-01", category: "general", qualifications: [{ level: "graduate", degree: "BA" }] }, rules);
    expect(result.status).toBe("strong_match");
  });

  it("treats missing domicile as missing information", () => {
    const result = evaluateMatch({ dateOfBirth: "1998-01-01", category: "general", qualifications: [{ level: "graduate" }] }, { ...rules, otherRules: [{ type: "domicile", value: "Karnataka", mandatory: true, ruleText: "Karnataka domicile is required." }] });
    expect(result.status).toBe("needs_information");
  });

  it("shows a language warning without failing the candidate", () => {
    const result = evaluateMatch({ dateOfBirth: "1998-01-01", category: "general", qualifications: [{ level: "graduate" }], languages: [] }, { ...rules, otherRules: [{ type: "language", value: "Kannada", mandatory: false, ruleText: "Verify Kannada language proficiency before applying." }] });
    expect(result.status).toBe("possible_match");
    expect(result.warnings).toHaveLength(1);
  });
});
