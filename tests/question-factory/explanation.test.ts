import { describe, expect, it } from "vitest";
import { explanationProblem } from "@/lib/question-factory/validator";
import { generateTemplateQuestion, templatesForTopic } from "@/lib/question-factory/templates";

describe("explanation quality gate", () => {
  it("rejects a one-line explanation", () => {
    expect(explanationProblem("Profit = 920 - 800 = 120, so the profit percent is 15%.")).toMatch(/one line|too short/i);
  });

  it("rejects an explanation with no Answer line", () => {
    const text = "Key idea: profit over cost price.\nStep 1: Profit is 920 - 800 = 120.\nStep 2: 120 / 800 x 100 = 15 per cent profit on the cost.\nWhy not the others: they use the selling price.";
    expect(explanationProblem(text)).toMatch(/Answer/);
  });

  it("accepts a full worked solution", () => {
    const text = "Key idea: profit percent uses the cost price as the base.\nStep 1: Profit = 920 - 800 = 120.\nStep 2: 120 / 800 x 100 = 15.\nAnswer: (B) 15%\nWhy not the others: (A) 12% is a slip.";
    expect(explanationProblem(text)).toBeNull();
  });

  const options = { A: "12%", B: "15%", C: "18%", D: "20%" };
  const good = "Key idea: profit percent uses the cost price as the base.\nStep 1: Profit = 920 - 800 = 120.\nStep 2: 120 / 800 x 100 = 15.\nAnswer: (B) 15%\nWhy not the others:\n(A) 12% is a slip.\n(C) 18% is a slip.\n(D) 20% is a slip.";

  it("accepts a solution that ends at the keyed option and value", () => {
    expect(explanationProblem(good, { correct: "B", options })).toBeNull();
  });

  it("rejects a solution whose Answer line names a different option than the key", () => {
    expect(explanationProblem(good, { correct: "C", options })).toMatch(/names option B but the key is C/);
  });

  it("rejects an Answer line that shows the wrong value", () => {
    expect(explanationProblem(good.replace("Answer: (B) 15%", "Answer: (B) 14%"), { correct: "B", options })).toMatch(/keyed value/);
  });

  it("rejects a Why-not line that lists the correct option", () => {
    expect(explanationProblem(good.replace("(A) 12% is a slip.", "(B) 15% is a slip."), { correct: "B", options })).toMatch(/lists option B/);
  });

  it("does not demand a number when the keyed option has none", () => {
    const text = "Key idea: a rise then an equal fall.\nStep 1: x then x gives a net factor below one.\nAnswer: (A) No change\nWhy not the others:\n(B) 4% is a slip.";
    expect(explanationProblem(text + " This line adds enough length to count.", { correct: "A", options: { A: "No change", B: "4%", C: "5%", D: "6%" } })).toBeNull();
  });

  it("every arithmetic template writes a worked solution that passes the gate", () => {
    for (const [name] of templatesForTopic()) {
      for (let seed = 1; seed <= 40; seed++) {
        const question = generateTemplateQuestion(name, "moderate", seed);
        if (!question) continue;
        const text = question.draft.explanation;
        expect(explanationProblem(text), `${name} seed ${seed}:\n${text}`).toBeNull();
        expect(text).toContain("Why not the others:");
        // the Answer line names the keyed option
        expect(text).toContain(`Answer: (${question.draft.correct_answer})`);
      }
    }
  });
});
