import { z } from "zod";
import type { PostRules } from "./types";

const category = z.enum(["general", "ews", "obc", "sc", "st", "other"]);

export const qualificationLevels = ["8th-pass", "10th-pass", "12th-pass", "iti", "diploma", "graduate", "btech", "postgraduate", "nursing", "teaching", "law"] as const;

export const postRulesSchema = z.object({
  ageRules: z
    .array(
      z.object({
        category: category.optional(),
        minimumAge: z.number().int().min(0).max(100).optional(),
        maximumAge: z.number().int().min(0).max(100),
        cutoffDate: z.string().date(),
        relaxationYears: z.number().int().min(0).max(30).optional(),
        stackable: z.boolean().optional(),
        ruleText: z.string().min(3)
      })
    )
    .default([]),
  qualificationRules: z
    .array(
      z.object({
        minimumLevel: z.enum(qualificationLevels),
        degree: z.string().optional(),
        specialisation: z.string().optional(),
        acceptedAnyDegree: z.boolean().optional(),
        equivalentAllowed: z.boolean().optional(),
        finalYearAllowed: z.boolean().optional(),
        mandatory: z.boolean(),
        ruleText: z.string().min(3)
      })
    )
    .default([]),
  experienceRules: z.array(z.object({ domain: z.string().min(1), minimumMonths: z.number().int().min(0), mandatory: z.boolean(), ruleText: z.string().min(3) })).default([]),
  otherRules: z.array(z.object({ type: z.enum(["domicile", "language"]), value: z.string().min(1), mandatory: z.boolean(), ruleText: z.string().min(3) })).default([])
});

export type ParsedRules = { ok: true; rules: PostRules } | { ok: false; message: string };

export function parsePostRules(raw: string): ParsedRules {
  const source = raw.trim() === "" ? "{}" : raw;
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch {
    return { ok: false, message: "Eligibility rules must be valid JSON." };
  }
  const parsed = postRulesSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: `Eligibility rules: ${issue.path.join(".") || "root"} - ${issue.message}` };
  }
  return { ok: true, rules: parsed.data as PostRules };
}

export const rulesTemplate = JSON.stringify(
  {
    ageRules: [{ category: "general", minimumAge: 18, maximumAge: 27, cutoffDate: "2026-08-01", relaxationYears: 5, stackable: true, ruleText: "Age 18-27 years as on 01-08-2026 for General category." }],
    qualificationRules: [{ minimumLevel: "graduate", mandatory: true, acceptedAnyDegree: true, ruleText: "Bachelor's degree from a recognised university." }],
    experienceRules: [],
    otherRules: []
  },
  null,
  2
);
