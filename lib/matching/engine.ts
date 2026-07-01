import { differenceInYears, parseISO } from "date-fns";
import type { AgeRule, CandidateProfile, MatchResult, PostRules, QualificationRule } from "./types";

const levelRank: Record<string, number> = {
  "8th-pass": 1,
  "10th-pass": 2,
  "12th-pass": 3,
  iti: 4,
  diploma: 5,
  graduate: 6,
  btech: 7,
  postgraduate: 8,
  nursing: 6,
  teaching: 6,
  law: 6
};

export function ageOnCutoff(dateOfBirth: string, cutoffDate: string) {
  return differenceInYears(parseISO(cutoffDate), parseISO(dateOfBirth));
}

export function evaluateMatch(candidate: CandidateProfile, rules: PostRules): MatchResult {
  const result: MatchResult = {
    status: "strong_match",
    score: 100,
    matched_rules: [],
    warnings: [],
    missing_information: [],
    failed_rules: []
  };

  evaluateAge(candidate, rules.ageRules, result);
  evaluateQualifications(candidate, rules.qualificationRules, result);
  evaluateExperience(candidate, rules, result);
  evaluateOther(candidate, rules, result);

  if (result.failed_rules.length) {
    result.status = "not_eligible";
    result.score = Math.min(result.score, 20);
  } else if (result.missing_information.length) {
    result.status = "needs_information";
    result.score = Math.min(result.score, 60);
  } else if (result.warnings.length) {
    result.status = "possible_match";
    result.score = Math.min(result.score, 82);
  }

  return result;
}

function evaluateAge(candidate: CandidateProfile, ageRules: AgeRule[], result: MatchResult) {
  if (!ageRules.length) return;
  if (!candidate.dateOfBirth) {
    result.missing_information.push("Date of birth is required to calculate age on the official cut-off date.");
    return;
  }
  const applicable = ageRules.filter((rule) => !rule.category || rule.category === candidate.category);
  const base = applicable.find((rule) => rule.category === candidate.category) ?? applicable[0];
  const age = ageOnCutoff(candidate.dateOfBirth, base.cutoffDate);
  const maxRelaxation = Math.max(...applicable.map((rule) => rule.relaxationYears ?? 0), 0);
  const maxAge = base.maximumAge + (base.stackable === false ? maxRelaxation : maxRelaxation);
  if (base.minimumAge && age < base.minimumAge) {
    result.failed_rules.push(`Your age on ${base.cutoffDate} is below the minimum age.`);
  } else if (age > maxAge) {
    result.failed_rules.push(`Your age on ${base.cutoffDate} is above the applicable limit.`);
  } else {
    result.matched_rules.push(base.ruleText);
  }
}

function evaluateQualifications(candidate: CandidateProfile, qualificationRules: QualificationRule[], result: MatchResult) {
  const mandatory = qualificationRules.filter((rule) => rule.mandatory);
  if (!mandatory.length) return;
  const matched = mandatory.some((rule) =>
    candidate.qualifications.some((qualification) => {
      const hasLevel = (levelRank[qualification.level] ?? 0) >= (levelRank[rule.minimumLevel] ?? 0);
      const degreeMatch = rule.acceptedAnyDegree || !rule.degree || qualification.degree?.toLowerCase() === rule.degree.toLowerCase() || Boolean(rule.equivalentAllowed);
      const specialisationMatch = !rule.specialisation || qualification.specialisation?.toLowerCase() === rule.specialisation.toLowerCase();
      const finalYearOk = !qualification.finalYear || Boolean(rule.finalYearAllowed);
      return hasLevel && degreeMatch && specialisationMatch && finalYearOk;
    })
  );
  if (matched) result.matched_rules.push("Your qualification matches the published qualification rule.");
  else result.failed_rules.push("Your qualification does not match the mandatory qualification rule.");
}

function evaluateExperience(candidate: CandidateProfile, rules: PostRules, result: MatchResult) {
  for (const rule of rules.experienceRules) {
    const months = candidate.experienceMonthsByDomain?.[rule.domain];
    if (months === undefined && rule.mandatory) result.missing_information.push(rule.ruleText);
    else if ((months ?? 0) < rule.minimumMonths && rule.mandatory) result.failed_rules.push(rule.ruleText);
    else result.matched_rules.push(rule.ruleText);
  }
}

function evaluateOther(candidate: CandidateProfile, rules: PostRules, result: MatchResult) {
  for (const rule of rules.otherRules) {
    if (rule.type === "domicile" && !candidate.domicileState) result.missing_information.push(rule.ruleText);
    else if (rule.type === "domicile" && candidate.domicileState !== rule.value && rule.mandatory) result.failed_rules.push(rule.ruleText);
    else if (rule.type === "language" && !candidate.languages?.includes(rule.value)) result.warnings.push(rule.ruleText);
    else result.matched_rules.push(rule.ruleText);
  }
}
