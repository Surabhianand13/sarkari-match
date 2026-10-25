import { describe, expect, it } from "vitest";
import { canTransition, contentHash, questionDraftSchema } from "@/lib/tests/question-schema";

const base = {
  exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Percentage", difficulty: "moderate" as const,
  question: "A number is increased by 20% and then decreased by 20%. What is the net change?",
  options: { A: "No change", B: "4% decrease", C: "4% increase", D: "2% decrease" },
  correct_answer: "B" as const,
  explanation: "1.20 x 0.80 = 0.96, which is a 4% decrease.",
  estimated_time_seconds: 60
};

describe("question draft schema", () => {
  it("accepts a well formed MCQ and defaults the source type", () => {
    const parsed = questionDraftSchema.parse(base);
    expect(parsed.source_type).toBe("original_ai_generated");
  });

  it("rejects duplicate options, missing options and bad answers", () => {
    expect(questionDraftSchema.safeParse({ ...base, options: { ...base.options, D: "no  change" } }).success).toBe(false);
    expect(questionDraftSchema.safeParse({ ...base, options: { A: "x", B: "y", C: "z" } }).success).toBe(false);
    expect(questionDraftSchema.safeParse({ ...base, correct_answer: "E" }).success).toBe(false);
  });
});

describe("content hash", () => {
  it("ignores case, spacing and option order", () => {
    const shuffled = { ...base, question: base.question.toUpperCase(), options: { A: "4% decrease", B: "No change", C: "2% decrease", D: "4% increase" } };
    expect(contentHash(shuffled)).toBe(contentHash(base));
  });

  it("differs for a different question", () => {
    expect(contentHash({ ...base, question: "A number is increased by 25% and then decreased by 25%. What is the net change?" })).not.toBe(contentHash(base));
  });
});

describe("validation status transitions", () => {
  it("never lets an AI-checked question publish without a human approval", () => {
    expect(canTransition("auto_passed", "published")).toBe(false);
    expect(canTransition("pending", "published")).toBe(false);
    expect(canTransition("needs_review", "published")).toBe(false);
    expect(canTransition("auto_passed", "approved")).toBe(true);
    expect(canTransition("approved", "published")).toBe(true);
  });
});
