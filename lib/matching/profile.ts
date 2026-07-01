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

const qualificationSlugPatterns: Array<[RegExp, string]> = [
  [/post\s*-?\s*grad/i, "postgraduate"],
  [/b\.?\s*tech|b\.?\s*e\b|engineering/i, "btech"],
  [/graduat|bachelor/i, "graduate"],
  [/iti/i, "iti"],
  [/diploma/i, "diploma"],
  [/12th|hsc|intermediate/i, "12th-pass"],
  [/10th|matric/i, "10th-pass"],
  [/8th/i, "8th-pass"],
  [/nursing/i, "nursing"],
  [/teach|b\.?\s*ed/i, "teaching"],
  [/law|llb/i, "law"]
];

export function normalizeQualificationLevel(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  for (const [pattern, slug] of qualificationSlugPatterns) {
    if (pattern.test(trimmed)) return slug;
  }
  return undefined;
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
