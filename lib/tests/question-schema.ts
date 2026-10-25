import { createHash } from "node:crypto";
import { z } from "zod";

export const optionKeys = ["A", "B", "C", "D"] as const;
export type OptionKey = (typeof optionKeys)[number];

export const difficulties = ["easy", "moderate", "hard"] as const;

export const validationStatuses = ["pending", "auto_failed", "auto_passed", "needs_review", "approved", "rejected", "published"] as const;
export type ValidationStatus = (typeof validationStatuses)[number];

export const sourceTypes = ["original_ai_generated", "human_authored", "imported"] as const;

export const questionDraftSchema = z
  .object({
    exam: z.string().trim().min(1),
    tier: z.string().trim().optional(),
    subject: z.string().trim().min(1),
    topic: z.string().trim().min(1),
    difficulty: z.enum(difficulties),
    question: z.string().trim().min(10).max(2000),
    options: z.object({
      A: z.string().trim().min(1).max(500),
      B: z.string().trim().min(1).max(500),
      C: z.string().trim().min(1).max(500),
      D: z.string().trim().min(1).max(500)
    }),
    correct_answer: z.enum(optionKeys),
    explanation: z.string().trim().min(10).max(4000),
    estimated_time_seconds: z.number().int().positive().max(600).default(60),
    source_type: z.enum(sourceTypes).default("original_ai_generated")
  })
  .refine((draft) => new Set(Object.values(draft.options).map((value) => normalizeText(value))).size === 4, {
    message: "options must be four distinct answers",
    path: ["options"]
  });

export type QuestionDraft = z.infer<typeof questionDraftSchema>;

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N}\s%.+\-*/=()]/gu, "").trim();
}

// Stable hash of the question stem and its option set, so reworded copies of the same item are caught by exact match
// and re-imports of the same question never create duplicates.
export function contentHash(draft: Pick<QuestionDraft, "question" | "options">) {
  const options = optionKeys.map((key) => normalizeText(draft.options[key])).sort().join("|");
  return createHash("sha256").update(`${normalizeText(draft.question)}::${options}`).digest("hex");
}

// Publication rules: a question can only be published after a human approved it; AI output never self-publishes.
const transitions: Record<ValidationStatus, ValidationStatus[]> = {
  pending: ["auto_failed", "auto_passed", "needs_review", "rejected"],
  auto_failed: ["rejected", "needs_review"],
  auto_passed: ["needs_review", "approved", "rejected"],
  needs_review: ["approved", "rejected"],
  approved: ["published", "rejected", "needs_review"],
  published: ["approved", "rejected"],
  rejected: ["needs_review"]
};

export function canTransition(from: ValidationStatus, to: ValidationStatus) {
  return transitions[from]?.includes(to) ?? false;
}
