import { describe, expect, it } from "vitest";
import { scoreAttempt, type ScorableQuestion } from "@/lib/tests/scoring";

const q = (id: string, section: string, topic: string, correct: string, marks = 2): ScorableQuestion => ({ id, section, subject: section, topic, correct, marks });
const questions = [q("1", "Quant", "Percentage", "A"), q("2", "Quant", "Percentage", "B"), q("3", "Reasoning", "Series", "C"), q("4", "Reasoning", "Series", "D")];

describe("scoreAttempt", () => {
  it("awards marks, deducts negative marks and ignores unanswered questions", () => {
    const result = scoreAttempt(questions, { "1": "A", "2": "C", "3": null }, 0.5);
    expect(result).toMatchObject({ score: 1.5, maxScore: 8, correct: 1, incorrect: 1, unattempted: 2, attempted: 2, accuracy: 50 });
    expect(result.percentage).toBeCloseTo(18.75);
  });

  it("breaks the result down by section and by topic, weakest topic first", () => {
    const result = scoreAttempt(questions, { "1": "A", "2": "B", "3": "A", "4": "A" }, 0.5);
    expect(result.bySection.find((s) => s.name === "Quant")).toMatchObject({ correct: 2, score: 4, accuracy: 100 });
    expect(result.bySection.find((s) => s.name === "Reasoning")).toMatchObject({ incorrect: 2, score: -1, accuracy: 0 });
    expect(result.byTopic[0].name).toBe("Reasoning / Series");
  });

  it("supports per-question marks and a perfect paper", () => {
    const result = scoreAttempt([q("1", "S", "T", "A", 3), q("2", "S", "T", "B", 1)], { "1": "A", "2": "B" }, 1);
    expect(result).toMatchObject({ score: 4, maxScore: 4, percentage: 100, accuracy: 100 });
  });

  it("handles an empty paper without dividing by zero", () => {
    expect(scoreAttempt([], {}, 0.5)).toMatchObject({ score: 0, maxScore: 0, percentage: 0, accuracy: 0 });
  });
});
