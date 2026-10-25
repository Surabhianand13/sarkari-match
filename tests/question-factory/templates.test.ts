import { describe, expect, it } from "vitest";
import { evaluateExpression, firstNumber } from "@/lib/question-factory/expression";
import { generateTemplateQuestion, templatesForTopic } from "@/lib/question-factory/templates";
import { contentHash, questionDraftSchema } from "@/lib/tests/question-schema";

describe("expression evaluator", () => {
  it("evaluates arithmetic with precedence, powers and unary minus", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("2 ^ 3 ^ 2")).toBe(512);
    expect(evaluateExpression("-(4 - 6) * 3")).toBe(6);
    expect(evaluateExpression("120 * 0.8 / 100")).toBeCloseTo(0.96);
  });

  it("refuses anything that is not plain arithmetic", () => {
    expect(evaluateExpression("process.exit(1)")).toBeNull();
    expect(evaluateExpression("1 / 0")).toBeNull();
    expect(evaluateExpression("2 +")).toBeNull();
    expect(evaluateExpression("(1 + 2")).toBeNull();
    expect(evaluateExpression("")).toBeNull();
  });

  it("reads the first number out of an option", () => {
    expect(firstNumber("4% decrease")).toBe(4);
    expect(firstNumber("₹1,250")).toBe(1250);
    expect(firstNumber("No change")).toBe(0);
    expect(firstNumber("Cannot be determined")).toBeNull();
  });
});

describe("quantitative templates", () => {
  const all = templatesForTopic();

  it("covers several SSC topics", () => {
    expect(all.length).toBeGreaterThanOrEqual(6);
  });

  it.each(all.map(([name]) => name))("%s: answers are computed, options distinct, schema valid", (name) => {
    let produced = 0;
    for (const difficulty of ["easy", "moderate", "hard"] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const question = generateTemplateQuestion(name, difficulty, seed);
        if (!question) continue;
        produced++;
        const parsed = questionDraftSchema.safeParse(question.draft);
        expect(parsed.success, `${name} seed ${seed}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
        const correct = question.draft.options[question.draft.correct_answer];
        const computed = evaluateExpression(question.verificationExpression);
        expect(computed).not.toBeNull();
        const shown = firstNumber(correct);
        if (shown !== null) expect(Math.abs((computed as number) - shown)).toBeLessThan(0.011);
      }
    }
    expect(produced).toBeGreaterThan(100);
  });

  it("is reproducible from its seed and varies across seeds", () => {
    const a = generateTemplateQuestion("profit_percent", "moderate", 7)!;
    const b = generateTemplateQuestion("profit_percent", "moderate", 7)!;
    expect(contentHash({ question: a.draft.question, options: a.draft.options })).toBe(contentHash({ question: b.draft.question, options: b.draft.options }));
    const hashes = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateTemplateQuestion("simple_interest", "moderate", seed)!;
      hashes.add(contentHash({ question: q.draft.question, options: q.draft.options }));
    }
    expect(hashes.size).toBeGreaterThan(120);
  });
});
