import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { mockGenerator, mockSolver } from "@/lib/question-factory/mock-provider";
import { findNearDuplicate, similarity } from "@/lib/question-factory/dedupe";
import { runCodeValidation } from "@/lib/question-factory/validator";
import type { QuestionDraft } from "@/lib/tests/question-schema";

process.env.DATABASE_URL = "pglite://memory://";

beforeAll(async () => {
  const { getDb } = await import("@/lib/db");
  const db = (await getDb())!;
  for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await db.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
});

const llmQuestion = (stem: string, correct: "A" | "B" | "C" | "D", expression: string) => ({
  exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Percentage", difficulty: "moderate", question: stem,
  options: { A: "10", B: "20", C: "30", D: "40" }, correct_answer: correct, explanation: "Work shown step by step here.", estimated_time_seconds: 60, verification_expression: expression
});

describe("near-duplicate detection", () => {
  it("flags reworded copies and ignores different questions", () => {
    const a = "A number is increased by 20% and then decreased by 20%. What is the net change?";
    expect(similarity(a, a)).toBe(1);
    expect(findNearDuplicate("A number is increased by 20% and then decreased by 20%. What is the net change now?", [a])).not.toBeNull();
    expect(findNearDuplicate("The ratio of two numbers is 3:5 and their sum is 64. Find the larger number.", [a])).toBeNull();
  });
});

describe("code validator", () => {
  const draft = (correct: "A" | "B" | "C" | "D"): QuestionDraft => ({ ...llmQuestion("A quantity doubles twice. By what factor does it grow?", correct, ""), difficulty: "moderate", source_type: "original_ai_generated" } as QuestionDraft);
  it("passes when the expression reproduces the keyed option and fails when it does not", () => {
    expect(runCodeValidation(draft("C"), "10 * 3").conclusive).toBe(true);
    const wrong = runCodeValidation(draft("C"), "10 * 2");
    expect(wrong.conclusive).toBe(false);
    expect(wrong.checks.some((check) => !check.passed)).toBe(true);
    expect(runCodeValidation(draft("C"), null).checks.some((check) => check.name === "expression_present" && !check.passed)).toBe(true);
  });
});

describe("question factory pipeline", () => {
  it("template batches store computed questions as auto_passed and never publish", async () => {
    const { getDb } = await import("@/lib/db");
    const { runBatch } = await import("@/lib/question-factory/pipeline");
    const db = (await getDb())!;
    const summary = await runBatch({ exam: "SSC CGL", subject: "Quantitative Aptitude", difficulty: "mixed", count: 30, strategy: "template" }, { db });
    expect(summary.stored).toBe(30);
    expect(summary.autoPassed).toBe(30);
    const statuses = await db.query<{ validation_status: string }>("select distinct validation_status from questions");
    expect(statuses.rows.map((row) => row.validation_status)).toEqual(["auto_passed"]);
    const batch = await db.query<{ status: string; generated_count: number }>("select status, generated_count from question_batches where id = $1", [summary.batchId]);
    expect(batch.rows[0]).toMatchObject({ status: "completed", generated_count: 30 });
  });

  it("a second template run adds new questions rather than repeating old ones", async () => {
    const { getDb } = await import("@/lib/db");
    const { runBatch } = await import("@/lib/question-factory/pipeline");
    const db = (await getDb())!;
    const before = Number((await db.query<{ n: string }>("select count(*) as n from questions")).rows[0].n);
    const summary = await runBatch({ exam: "SSC CGL", subject: "Quantitative Aptitude", topic: "Percentage", difficulty: "easy", count: 10, strategy: "template" }, { db });
    const after = Number((await db.query<{ n: string }>("select count(*) as n from questions")).rows[0].n);
    expect(after - before).toBe(summary.stored);
    const distinct = Number((await db.query<{ n: string }>("select count(distinct content_hash) as n from questions")).rows[0].n);
    expect(distinct).toBe(after);
  });

  it("AI batches: agreement plus a matching expression passes, a disagreeing solver fails, no solver needs review", async () => {
    const { getDb } = await import("@/lib/db");
    const { runBatch } = await import("@/lib/question-factory/pipeline");
    const db = (await getDb())!;
    const questions = [
      llmQuestion("What is 30% of 100 apples shared equally among the first group?", "C", "100 * 30 / 100"),
      llmQuestion("What is 40% of 100 oranges packed into the second crate?", "D", "100 * 40 / 100"),
      llmQuestion("What is 20% of 100 pencils kept in the third drawer today?", "B", "100 * 25 / 100")
    ];
    const generator = mockGenerator(questions);
    const solver = mockSolver((question) => (question.includes("40%") ? "A" : question.includes("30%") ? "C" : "B"));
    const summary = await runBatch({ exam: "SSC CGL", subject: "Quantitative Aptitude", topic: "Percentage", difficulty: "moderate", count: 3, strategy: "llm" }, { db, generator, solver });
    expect(summary.stored).toBe(3);
    const rows = await db.query<{ stem: string; validation_status: string; critic_model: string }>("select stem, validation_status, critic_model from questions where batch_id = $1", [summary.batchId]);
    const byStem = Object.fromEntries(rows.rows.map((row) => [row.stem.slice(8, 11), row.validation_status]));
    expect(byStem["30%"]).toBe("auto_passed");
    expect(byStem["40%"]).toBe("auto_failed");
    expect(byStem["20%"]).toBe("auto_failed");

    const noSolver = await runBatch({ exam: "SSC CGL", subject: "Quantitative Aptitude", topic: "Percentage", difficulty: "moderate", count: 1, strategy: "llm" }, { db, generator: mockGenerator([llmQuestion("What is 50% of 100 books placed on the top shelf?", "A", "10")]) });
    expect(noSolver.needsReview + noSolver.autoFailed).toBe(1);
    expect(noSolver.autoPassed).toBe(0);
  });

  it("general awareness always needs a human fact check", async () => {
    const { getDb } = await import("@/lib/db");
    const { runBatch } = await import("@/lib/question-factory/pipeline");
    const db = (await getDb())!;
    const q = { exam: "SSC CGL", tier: "Tier I", subject: "General Awareness", topic: "Polity", difficulty: "easy", question: "Which article of the Indian Constitution abolishes untouchability?", options: { A: "Article 14", B: "Article 17", C: "Article 19", D: "Article 21" }, correct_answer: "B", explanation: "Article 17 abolishes untouchability.", estimated_time_seconds: 30 };
    const summary = await runBatch({ exam: "SSC CGL", subject: "General Awareness", topic: "Polity", difficulty: "easy", count: 1, strategy: "llm" }, { db, generator: mockGenerator([q]), solver: mockSolver(() => "B") });
    expect(summary).toMatchObject({ stored: 1, needsReview: 1, autoPassed: 0 });
  });

  it("rejects templates for non-numeric subjects", async () => {
    const { getDb } = await import("@/lib/db");
    const { runBatch } = await import("@/lib/question-factory/pipeline");
    await expect(runBatch({ exam: "SSC CGL", subject: "English", difficulty: "easy", count: 1, strategy: "template" }, { db: (await getDb())! })).rejects.toThrow(/Quantitative/);
  });
});
