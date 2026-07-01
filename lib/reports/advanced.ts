import type { CandidateProfileSummary } from "@/lib/profiles/limits";
import type { MatchResult } from "@/lib/matching/types";

export type AdvancedEligibilityReport = {
  profileId: string;
  profileName: string;
  headline: string;
  recommendations: string[];
  exportable: boolean;
};

export function buildAdvancedEligibilityReport({ profile, results, proPlusEnabled }: { profile: CandidateProfileSummary; results: MatchResult[]; proPlusEnabled: boolean }): AdvancedEligibilityReport {
  const strongMatches = results.filter((result) => result.status === "strong_match").length;
  const missing = [...new Set(results.flatMap((result) => result.missing_information))];
  return {
    profileId: profile.id,
    profileName: profile.displayName,
    headline: `${strongMatches} strong matches for ${profile.displayName}`,
    recommendations: missing.length ? missing.slice(0, 5) : ["Keep domicile, registration and experience details up to date."],
    exportable: proPlusEnabled
  };
}

export function advancedReportAccess(planHasDownloadableReport: boolean, proPlusFlagEnabled: boolean) {
  return planHasDownloadableReport && proPlusFlagEnabled;
}
