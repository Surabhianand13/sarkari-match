import { describe, expect, it } from "vitest";
import { evaluateMatch } from "@/lib/matching/engine";
import { normalizeQualificationLevel } from "@/lib/matching/profile";
import type { CandidateProfile, PostRules } from "@/lib/matching/types";

const rulesFor = (minimumLevel: string): PostRules => ({
  ageRules: [],
  qualificationRules: [{ minimumLevel, mandatory: true, acceptedAnyDegree: true, ruleText: "x" }],
  experienceRules: [],
  otherRules: []
});
const candidate = (level: string, degree?: string): CandidateProfile => ({ category: "general", qualifications: [{ level, degree }] });

describe("reading a qualification from notification wording", () => {
  it("treats any graduate, including when B.E/B.Tech is named beside it, as a graduate requirement", () => {
    for (const text of ["Any Graduate", "Graduate in any discipline", "Any degree from a recognised university", "Any Graduate or B.E/B.Tech", "Bachelor's Degree in any stream", "Bachelor's Degree in the prescribed disciplines"]) {
      expect(normalizeQualificationLevel(text), text).toBe("graduate");
    }
  });

  it("treats a named engineering degree as B.E/B.Tech, and a diploma in engineering as a diploma", () => {
    for (const text of ["B.E/B.Tech in Computer Science", "BE (Civil)", "B.E. Mechanical", "Bachelor of Engineering", "Degree in Engineering", "BTech"]) {
      expect(normalizeQualificationLevel(text), text).toBe("btech");
    }
    expect(normalizeQualificationLevel("Diploma in Civil Engineering")).toBe("diploma");
    expect(normalizeQualificationLevel("3-year Diploma in Commercial Practice")).toBe("diploma");
  });

  it("does not read the word 'be' or other words as a qualification", () => {
    expect(normalizeQualificationLevel("Candidates must be a graduate")).toBe("graduate");
    expect(normalizeQualificationLevel("10th pass with additional skill certificate")).toBe("10th-pass");
    expect(normalizeQualificationLevel("12th pass, must be lawful resident")).toBe("12th-pass");
  });

  it("reads regional names for the school levels", () => {
    expect(normalizeQualificationLevel("SSLC")).toBe("10th-pass");
    expect(normalizeQualificationLevel("II PUC")).toBe("12th-pass");
    expect(normalizeQualificationLevel("Post Graduate / M.Sc")).toBe("postgraduate");
    expect(normalizeQualificationLevel("B.Tech/B.E")).toBe("btech");
  });
});

describe("any graduate and B.E/B.Tech", () => {
  it("lets a B.E/B.Tech candidate apply to an any-graduate post", () => {
    expect(evaluateMatch(candidate("btech"), rulesFor("graduate")).status).toBe("strong_match");
    expect(evaluateMatch(candidate("graduate"), rulesFor("graduate")).status).toBe("strong_match");
    expect(evaluateMatch(candidate("postgraduate"), rulesFor("graduate")).status).toBe("strong_match");
  });

  it("keeps a B.E/B.Tech post for B.E/B.Tech candidates only", () => {
    expect(evaluateMatch(candidate("btech"), rulesFor("btech")).status).toBe("strong_match");
    expect(evaluateMatch(candidate("graduate", "B.E"), rulesFor("btech")).status).toBe("strong_match");
    expect(evaluateMatch(candidate("graduate", "BA"), rulesFor("btech")).status).toBe("not_eligible");
    expect(evaluateMatch(candidate("diploma"), rulesFor("btech")).status).toBe("not_eligible");
  });

  it("asks a post graduate to confirm a B.E/B.Tech first degree instead of passing or failing them", () => {
    const result = evaluateMatch(candidate("postgraduate"), rulesFor("btech"));
    expect(result.status).toBe("possible_match");
    expect(result.warnings.join(" ")).toMatch(/first degree/);
  });
});

describe("alternatives in a qualification", () => {
  it("takes the lowest level when the notification offers a choice", () => {
    expect(normalizeQualificationLevel("II PUC/3-year Diploma in Commercial Practice with typewriting")).toBe("12th-pass");
    expect(normalizeQualificationLevel("Graduate / Post Graduate")).toBe("graduate");
    expect(normalizeQualificationLevel("10th Pass or ITI")).toBe("10th-pass");
    expect(normalizeQualificationLevel("Graduate in Arts/Science/Commerce")).toBe("graduate");
    expect(normalizeQualificationLevel("B.E/B.Tech or M.Tech")).toBe("btech");
  });
});
