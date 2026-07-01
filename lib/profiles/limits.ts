import { numericEntitlement, type PlanCode } from "@/lib/entitlements/plans";

export type CandidateProfileSummary = {
  id: string;
  displayName: string;
  completion: number;
  relationship?: "self" | "spouse" | "child" | "sibling" | "parent" | "other";
};

export function candidateProfileLimit(plan: PlanCode) {
  return numericEntitlement(plan, "candidate_profile_limit");
}

export function canCreateCandidateProfile(plan: PlanCode, existingCount: number) {
  return existingCount < candidateProfileLimit(plan);
}

export function profileCompletenessLabel(completion: number) {
  if (completion >= 90) return "Excellent";
  if (completion >= 70) return "Good";
  if (completion >= 40) return "Needs a few details";
  return "Incomplete";
}
