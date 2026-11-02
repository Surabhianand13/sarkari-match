import { differenceInYears, parseISO } from "date-fns";
import { levelRank } from "./levels";
import { normalizeQualificationLevel } from "./profile";
import type { AgeRule, CandidateProfile, CandidateQualification, MatchResult, PostRules, QualificationRule } from "./types";

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

// "Any graduate" is a rung on the ladder: every higher level, B.E/B.Tech included, meets it. A named B.E/B.Tech requirement is not:
// a candidate with an ordinary degree does not meet it, and a post graduate may or may not have done B.E/B.Tech first.
const degreeSpecificLevels = new Set(["btech"]);

type Fit = "yes" | "check" | "no";

function qualificationFit(qualification: CandidateQualification, rule: QualificationRule): Fit {
  const degreeMatch = rule.acceptedAnyDegree || !rule.degree || qualification.degree?.toLowerCase() === rule.degree.toLowerCase() || Boolean(rule.equivalentAllowed);
  const specialisationMatch = !rule.specialisation || qualification.specialisation?.toLowerCase() === rule.specialisation.toLowerCase();
  const finalYearOk = !qualification.finalYear || Boolean(rule.finalYearAllowed);
  if (!degreeMatch || !specialisationMatch || !finalYearOk) return "no";

  if (degreeSpecificLevels.has(rule.minimumLevel)) {
    if (qualification.level === rule.minimumLevel || normalizeQualificationLevel(qualification.degree ?? "") === rule.minimumLevel) return "yes";
    return qualification.level === "postgraduate" ? "check" : "no";
  }
  return (levelRank[qualification.level] ?? 0) >= (levelRank[rule.minimumLevel] ?? 0) ? "yes" : "no";
}

function evaluateQualifications(candidate: CandidateProfile, qualificationRules: QualificationRule[], result: MatchResult) {
  const mandatory = qualificationRules.filter((rule) => rule.mandatory);
  if (!mandatory.length) return;
  const fits = mandatory.flatMap((rule) => candidate.qualifications.map((qualification) => qualificationFit(qualification, rule)));
  if (fits.includes("yes")) result.matched_rules.push("Your qualification matches the published qualification rule.");
  else if (fits.includes("check")) result.warnings.push("This post asks for a B.E/B.Tech degree. Your post graduate profile qualifies only if your first degree was a B.E/B.Tech.");
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
