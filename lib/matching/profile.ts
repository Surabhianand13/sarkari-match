import { levelRank } from "./levels";
import type { CandidateProfile, Category } from "./types";

const categoryMap: Record<string, Category> = {
  general: "general",
  ews: "ews",
  obc: "obc",
  sc: "sc",
  st: "st"
};

export function normalizeCategory(input: string): Category {
  return categoryMap[input.trim().toLowerCase()] ?? "other";
}

// "Any graduate" and "graduate in any discipline" welcome every degree, B.E/B.Tech included. Without that wording a named
// engineering degree is a requirement of its own, and only holders of that degree meet it.
const anyDegree = /\bany\s+(?:recognised\s+|recognized\s+)?(?:graduate|graduation|degree|discipline|stream|branch|subject)\b|\b(?:graduate|degree|graduation)\s+(?:in|from)\s+any\b/i;

// Case matters for "BE": in lower case it is the word ("must be a graduate").
const bachelorOfEngineering = /(?<![A-Za-z])B\.?\s?E\.?(?![A-Za-z])(?!\s+(?:A|AN|THE|IN|AT|FROM|OF|ON|WITH|TO)\b)/;

const qualificationSlugPatterns: Array<[RegExp, string]> = [
  [/post\s*-?\s*grad|\bmaster'?s?\b|\bM\.?\s?(?:Tech|Sc|Com|Phil)\b|\bPG\b/i, "postgraduate"],
  // A bare "engineering" is not enough: "Diploma in Civil Engineering" is a diploma.
  [/\bb\.?\s*tech\b|\bbachelor\s+of\s+(?:engineering|technology)\b|\b(?:graduate|degree)\s+in\s+engineering\b|\bengineering\s+(?:graduate|degree)\b/i, "btech"],
  [/graduat|bachelor/i, "graduate"],
  [/\biti\b/i, "iti"],
  [/diploma/i, "diploma"],
  [/\b12th\b|\bhsc\b|\bintermediate\b|\bp\.?u\.?c\b|\bplus\s*two\b|\+\s*2\b|higher\s+secondary|senior\s+secondary/i, "12th-pass"],
  [/\b10th\b|\bsslc\b|\bmatric(?:ulation)?\b|\bhigh\s+school\b/i, "10th-pass"],
  [/\b8th\b/i, "8th-pass"],
  [/nursing/i, "nursing"],
  [/\bteach|\bb\.?\s*ed\b/i, "teaching"],
  [/\blaw\b|\bllb\b/i, "law"]
];

function levelOfPhrase(phrase: string): string | undefined {
  if (bachelorOfEngineering.test(phrase) && !/post\s*-?\s*grad/i.test(phrase)) return "btech";
  for (const [pattern, slug] of qualificationSlugPatterns) {
    if (pattern.test(phrase)) return slug;
  }
  return undefined;
}

// The lowest level a qualification text asks for. "II PUC / Diploma" and "Graduate or Post Graduate" are alternatives, so the lower one is enough.
export function normalizeQualificationLevel(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (anyDegree.test(trimmed)) return "graduate";
  const alternatives = trimmed.split(/\s*\/\s*|\s+or\s+/i).map(levelOfPhrase).filter((level): level is string => Boolean(level));
  if (alternatives.length > 1) return alternatives.reduce((lowest, level) => ((levelRank[level] ?? 0) < (levelRank[lowest] ?? 0) ? level : lowest));
  return levelOfPhrase(trimmed);
}

export function deriveCandidateProfile(params: {
  dateOfBirth?: string;
  category?: string;
  qualification?: string;
  state?: string;
}): CandidateProfile {
  const level = normalizeQualificationLevel(params.qualification ?? "");
  return {
    dateOfBirth: params.dateOfBirth || undefined,
    category: normalizeCategory(params.category ?? "general"),
    domicileState: params.state || undefined,
    qualifications: level ? [{ level }] : []
  };
}
