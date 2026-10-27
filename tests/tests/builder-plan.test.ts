import { describe, expect, it } from "vitest";
import { LEVEL_MIX, planTests, splitByMix, type BuildInput, type Candidate } from "@/lib/tests/builder";

function pool(n: number, prefix = "q"): Candidate[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, topic: `t${i % 5}`, difficulty: (["easy", "moderate", "hard"] as const)[i % 3], used: 0 }));
}

const base: BuildInput = {
  seriesId: "s", kind: "full", level: "intermediate", count: 4, titlePrefix: "Mock", durationMinutes: 60, defaultMarks: 2, negativeMarks: 0.5,
  sections: [{ name: "Quant", subject: "Quant", questions: 25 }], maxReuse: 1, status: "draft", seed: 7
};

describe("splitByMix", () => {
  it("always sums to the total, for any mix", () => {
    for (const total of [1, 7, 10, 25, 33, 100]) {
      for (const mix of Object.values(LEVEL_MIX)) {
        const split = splitByMix(total, mix);
        expect(split.easy + split.moderate + split.hard).toBe(total);
      }
    }
  });

  it("follows the level: beginner is mostly easy, advanced mostly moderate and hard", () => {
    expect(splitByMix(25, LEVEL_MIX.beginner).easy).toBeGreaterThan(splitByMix(25, LEVEL_MIX.advanced).easy);
    expect(splitByMix(25, LEVEL_MIX.advanced).hard).toBeGreaterThan(splitByMix(25, LEVEL_MIX.beginner).hard);
  });
});

describe("planTests", () => {
  it("never repeats a question inside a test, and uses each question at most maxReuse times", () => {
    const plan = planTests([pool(150)], base);
    expect(plan.shortages).toEqual([]);
    expect(plan.tests).toHaveLength(4);
    const seen = new Map<string, number>();
    for (const test of plan.tests) {
      const ids = test.sections[0].questionIds;
      expect(ids).toHaveLength(25);
      expect(new Set(ids).size).toBe(25);
      for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    expect(Math.max(...seen.values())).toBe(1);
  });

  it("spreads reuse evenly within a difficulty: every question is used before any is used twice", () => {
    const candidates = pool(60);
    const plan = planTests([candidates], { ...base, count: 4, maxReuse: 2, level: "beginner", sections: [{ name: "Quant", subject: "Quant", questions: 15 }] });
    expect(plan.shortages).toEqual([]);
    const counts = new Map<string, number>();
    for (const test of plan.tests) for (const id of test.sections[0].questionIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    // Beginner tests are mostly easy, so the 20 easy questions are all used (some twice) while the rest are used at most once.
    for (const candidate of candidates.filter((item) => item.difficulty === "easy")) expect(counts.get(candidate.id) ?? 0).toBeGreaterThanOrEqual(1);
    const easyUses = candidates.filter((item) => item.difficulty === "easy").map((item) => counts.get(item.id) ?? 0);
    expect(Math.max(...easyUses) - Math.min(...easyUses)).toBeLessThanOrEqual(1);
  });

  it("prefers questions that are not yet used in other tests", () => {
    const candidates = pool(80);
    for (const candidate of candidates.slice(0, 40)) candidate.used = 1;
    const plan = planTests([candidates], { ...base, count: 1, maxReuse: 2 });
    const used = new Set(candidates.slice(0, 40).map((candidate) => candidate.id));
    const fresh = plan.tests[0].sections[0].questionIds.filter((id) => !used.has(id)).length;
    expect(fresh).toBe(25);
  });

  it("reports a shortage and plans nothing partial when the bank is too small", () => {
    const plan = planTests([pool(30)], { ...base, count: 3, maxReuse: 1 });
    expect(plan.tests).toHaveLength(1);
    expect(plan.shortages.length).toBeGreaterThan(0);
    expect(plan.shortages[0]).toContain("Quant");
  });

  it("borrows from the nearest difficulty when one runs short, and is repeatable with the same seed", () => {
    const onlyEasyAndModerate = pool(120).filter((candidate) => candidate.difficulty !== "hard");
    const a = planTests([onlyEasyAndModerate], { ...base, count: 2, level: "advanced" });
    const b = planTests([onlyEasyAndModerate], { ...base, count: 2, level: "advanced" });
    expect(a.shortages).toEqual([]);
    expect(a.tests[0].sections[0].questionIds).toHaveLength(25);
    expect(a.tests).toEqual(b.tests);
  });

  it("fills each section from its own subject pool", () => {
    const plan = planTests([pool(80, "a"), pool(80, "b")], { ...base, count: 2, sections: [{ name: "A", subject: "A", questions: 10 }, { name: "B", subject: "B", questions: 10 }] });
    for (const test of plan.tests) {
      expect(test.sections[0].questionIds.every((id) => id.startsWith("a"))).toBe(true);
      expect(test.sections[1].questionIds.every((id) => id.startsWith("b"))).toBe(true);
    }
  });
});
