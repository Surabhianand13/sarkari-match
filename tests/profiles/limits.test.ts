import { describe, expect, it } from "vitest";
import { canCreateCandidateProfile, candidateProfileLimit, profileCompletenessLabel } from "@/lib/profiles/limits";

describe("candidate profile limits", () => {
  it("limits free/pro to one profile and pro plus to three", () => {
    expect(candidateProfileLimit("free")).toBe(1);
    expect(candidateProfileLimit("pro_plus_monthly")).toBe(3);
  });

  it("checks whether another profile can be created", () => {
    expect(canCreateCandidateProfile("pro_plus_monthly", 2)).toBe(true);
    expect(canCreateCandidateProfile("pro_plus_monthly", 3)).toBe(false);
  });

  it("labels profile completeness", () => {
    expect(profileCompletenessLabel(75)).toBe("Good");
  });
});
