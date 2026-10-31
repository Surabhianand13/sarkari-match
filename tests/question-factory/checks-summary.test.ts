import { describe, expect, it } from "vitest";
import { summariseChecks } from "@/lib/question-factory/checks-summary";
import { isExplanationReason } from "@/lib/question-factory/validator";

describe("summariseChecks", () => {
  it("lists what passed, what failed and what did not run", () => {
    const lines = summariseChecks({
      proven: false,
      checks: [{ name: "expression_matches_key", passed: true, detail: "computed 25, keyed 25" }, { name: "explanation_detailed", passed: false, detail: "The explanation is too short or in one line." }],
      solver: { model: "gpt", agrees: true, ambiguous: false, answer: "B" },
      flags: ["Syllabus: the topic is not found in the uploaded syllabus."]
    });
    expect(lines.find((l) => l.label === "Arithmetic matches the key")?.state).toBe("pass");
    expect(lines.find((l) => l.label.startsWith("Solution is step by step"))?.state).toBe("fail");
    expect(lines.find((l) => l.label.startsWith("Independent solver"))?.state).toBe("pass");
    expect(lines.find((l) => l.label === "Needs a person")?.state).toBe("flag");
  });

  it("says plainly when a question was made before solutions were checked", () => {
    const lines = summariseChecks({ checks: [] });
    expect(lines.find((l) => l.label === "Solution check")?.detail).toMatch(/before solutions were checked/);
  });

  it("copes with empty or missing notes", () => {
    expect(Array.isArray(summariseChecks(null))).toBe(true);
    expect(Array.isArray(summariseChecks({}))).toBe(true);
  });
});

describe("isExplanationReason", () => {
  it("recognises solution-only failures and nothing else", () => {
    expect(isExplanationReason("The explanation is too short or in one line. Write it as separate lines.")).toBe(true);
    expect(isExplanationReason("The Answer line names option A but the key is B.")).toBe(true);
    expect(isExplanationReason("The reviewer found an error in the explanation: Step 2 is wrong.")).toBe(true);
    expect(isExplanationReason("An independent solver chose A but the key says B.")).toBe(false);
    expect(isExplanationReason("Two options have the same numeric value.")).toBe(false);
  });
});
