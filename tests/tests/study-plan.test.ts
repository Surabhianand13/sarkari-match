import { describe, expect, it } from "vitest";
import { buildStudyPlan } from "@/lib/study-plan";

describe("study plan", () => {
  it("gives a starter plan when there is not enough data", () => {
    const plan = buildStudyPlan([{ subject: "Quant", topic: "Percentage", accuracy: 20, attempted: 2 }], false);
    expect(plan).toHaveLength(7);
    expect(plan[0].tasks[0].label).toMatch(/free sample test/i);
  });

  it("targets the weakest topics first and ends with a mock and its review", () => {
    const plan = buildStudyPlan(
      [
        { subject: "Quant", topic: "Percentage", accuracy: 30, attempted: 10 },
        { subject: "Quant", topic: "Ratio", accuracy: 45, attempted: 8 },
        { subject: "Reasoning", topic: "Series", accuracy: 50, attempted: 6 }
      ],
      true
    );
    expect(plan).toHaveLength(7);
    expect(plan[0].title).toContain("Percentage");
    expect(plan[1].title).toContain("Ratio");
    expect(plan[4].tasks[0].minutes).toBe(60);
    expect(plan[5].title).toMatch(/review/i);
  });

  it("copes with a single weak topic", () => {
    const plan = buildStudyPlan([{ subject: "Quant", topic: "Percentage", accuracy: 30, attempted: 10 }], false);
    expect(plan).toHaveLength(7);
    expect(plan.every((day) => day.tasks.length > 0)).toBe(true);
  });
});
