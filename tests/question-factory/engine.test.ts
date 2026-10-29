import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { proofread } from "@/lib/question-factory/language-rules";
import { pyqStems, topicInSyllabus } from "@/lib/question-factory/knowledge";
import { parseChatAnswers, tasksToChatMessage } from "@/lib/question-factory/queue";
import type { Db } from "@/lib/db";

process.env.DATABASE_URL = "pglite://memory://";

let db: Db;

beforeAll(async () => {
  const { getDb } = await import("@/lib/db");
  db = (await getDb())!;
  for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await db.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
});

type Q = { question: string; options: Record<"A" | "B" | "C" | "D", string>; correct_answer: "A" | "B" | "C" | "D"; verification_expression?: string };

const full = (q: Q, subject: string, topic: string) => ({
  exam: "SSC CGL", tier: "Tier I", subject, topic, difficulty: "moderate", explanation: "Work this out step by step to reach the keyed option.", estimated_time_seconds: 60, ...q
});

const quant: Q[] = [
  { question: "A trader buys a radio for 800 rupees and sells it at a profit of 25 percent. At what price is it sold?", options: { A: "900", B: "1000", C: "1050", D: "1100" }, correct_answer: "B", verification_expression: "800 * 1.25" },
  { question: "The sum of two numbers is 90 and their difference is 30. What is the larger number?", options: { A: "50", B: "60", C: "70", D: "40" }, correct_answer: "B", verification_expression: "(90 + 30) / 2" },
  { question: "A train 150 metres long crosses a pole in 10 seconds. Find its speed in kilometres per hour.", options: { A: "36", B: "48", C: "54", D: "60" }, correct_answer: "C", verification_expression: "150 / 10 * 18 / 5" },
  // The key below is wrong (15 percent of 400 is 60), so the code check rejects it and the fixer has to repair it.
  { question: "What is 15 percent of 400 rupees exactly?", options: { A: "40", B: "50", C: "60", D: "70" }, correct_answer: "A", verification_expression: "400 * 15 / 100" }
];

const repaired: Q = { question: "Find fifteen percent of 400 rupees. Give the exact amount.", options: { A: "40", B: "50", C: "60", D: "70" }, correct_answer: "C", verification_expression: "400 * 15 / 100" };

type Task = { id: string; stage: string; request: { system: string; prompt: string } };

// Plays the part of a person answering the queue from a chat.
function answerer(questions: Q[], subject: string, topic: string, overrides: Partial<Record<string, (task: Task) => unknown>> = {}) {
  return (task: Task): unknown => {
    const override = overrides[task.stage];
    if (override) return override(task);
    if (task.stage === "write") return { questions: questions.map((q) => full(q, subject, topic)) };
    if (task.stage === "solve") {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      const known = [...questions, repaired].find((q) => q.question === stem);
      return { answer: known?.correct_answer ?? "A", reasoning: "worked it out", ambiguous: false };
    }
    if (task.stage === "review") {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      return { ok: true, issues: [], question: stem, explanation: "Work this out step by step to reach the keyed option.", in_syllabus: true, level: "as_expected", reason: "Standard topic." };
    }
    if (task.stage === "fix") return { ...repaired, explanation: "Fifteen percent of 400 is 60, so option C is correct." };
    throw new Error(`Unexpected stage ${task.stage}`);
  };
}

async function drain(batchId: string, respond: (task: Task) => unknown, rounds = 40) {
  const { advanceBatch, queueAi } = await import("@/lib/question-factory/engine");
  const { answerTasks, pendingTasks } = await import("@/lib/question-factory/queue");
  for (let round = 0; round < rounds; round++) {
    const batch = await advanceBatch(db, queueAi(db), batchId, { budgetMs: 5000 });
    if (batch?.status === "completed" || batch?.status === "failed") return batch;
    const tasks = (await pendingTasks(db, { batchId, limit: 100 })) as Task[];
    if (!tasks.length) continue;
    await answerTasks(db, tasks.map((task) => ({ id: task.id, response: JSON.stringify(respond(task)) })), "test");
  }
  throw new Error("The run did not finish");
}

describe("runs without AI", () => {
  it("builds, checks and settles template questions with a visible event trail", async () => {
    const { advanceBatch, createBatch, rulesAi } = await import("@/lib/question-factory/engine");
    const { batchSnapshot } = await import("@/lib/question-factory/monitor");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", difficulty: "mixed", count: 12, mode: "rules" });
    let batch = await advanceBatch(db, rulesAi, id, { budgetMs: 20000 });
    for (let i = 0; i < 5 && batch?.status === "running"; i++) batch = await advanceBatch(db, rulesAi, id, { budgetMs: 20000 });
    expect(batch?.status).toBe("completed");
    const snapshot = await batchSnapshot(db, id);
    expect(snapshot!.totals.written).toBe(12);
    expect(snapshot!.totals.inFlight).toBe(0);
    expect(snapshot!.totals.autoPassed + snapshot!.totals.needsReview + snapshot!.totals.rejected).toBe(12);
    expect(snapshot!.totals.autoPassed).toBeGreaterThan(5);
    expect(snapshot!.events.length).toBeGreaterThan(0);
    expect(snapshot!.stages.find((stage) => stage.id === "solve")!.passed).toBeGreaterThan(5);
  });

  it("refuses a no-AI run for subjects that need a writer", async () => {
    const { createBatch } = await import("@/lib/question-factory/engine");
    await expect(createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "General Awareness", difficulty: "easy", count: 5, mode: "rules" })).rejects.toThrow(/Quantitative/);
  });
});

describe("runs on the chat work queue", () => {
  it("waits for answers, then writes, solves, proofreads, checks and repairs a faulty question", async () => {
    const { advanceBatch, createBatch, queueAi } = await import("@/lib/question-factory/engine");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Mixed arithmetic", difficulty: "moderate", count: 4, mode: "queue" });

    const first = await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    expect(first?.status).toBe("waiting_ai");
    const { pendingTasks } = await import("@/lib/question-factory/queue");
    const initial = await pendingTasks(db, { batchId: id });
    expect(initial.map((task) => task.stage)).toEqual(["write"]);

    const done = await drain(id, answerer(quant, "Quantitative Aptitude", "Mixed arithmetic"));
    expect(done.status).toBe("completed");

    const rows = await db.query<{ stem: string; validation_status: string; fix_attempts: number; correct_option: string }>("select stem, validation_status, fix_attempts, correct_option from questions where batch_id = $1 order by created_at", [id]);
    expect(rows.rows).toHaveLength(4);
    expect(rows.rows.every((row) => row.validation_status === "auto_passed")).toBe(true);
    const fixed = rows.rows.find((row) => row.fix_attempts === 1)!;
    expect(fixed.stem).toBe(repaired.question);
    expect(fixed.correct_option).toBe("C");

    const events = await db.query<{ stage: string; outcome: string }>("select stage, outcome from factory_events where batch_id = $1", [id]);
    expect(events.rows.some((event) => event.stage === "solve" && event.outcome === "rejected")).toBe(true);
    expect(events.rows.some((event) => event.stage === "fix" && event.outcome === "fixed")).toBe(true);
  });

  it("sends a question to a person when the independent solver keeps disagreeing", async () => {
    const stubborn: Q = { question: "A tank fills in 6 hours and empties in 12 hours. How long does it take to fill when both pipes run?", options: { A: "10", B: "12", C: "14", D: "16" }, correct_answer: "B", verification_expression: "(6 * 12) / (12 - 6)" };
    const { createBatch } = await import("@/lib/question-factory/engine");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Pipes", difficulty: "moderate", count: 1, mode: "queue" });
    let n = 0;
    const respond = answerer([stubborn], "Quantitative Aptitude", "Pipes", {
      solve: () => ({ answer: "A", reasoning: "disagrees", ambiguous: false }),
      fix: () => ({ ...stubborn, explanation: "Both pipes together fill the tank in twelve hours.", question: `${stubborn.question} Round ${++n}.` })
    });
    const done = await drain(id, respond);
    expect(done.status).toBe("completed");
    const row = (await db.query<{ validation_status: string; fix_attempts: number }>("select validation_status, fix_attempts from questions where batch_id = $1", [id])).rows[0];
    expect(row.fix_attempts).toBe(2);
    expect(row.validation_status).toBe("auto_failed");
  });
});

describe("source material", () => {
  it("rejects near copies of past papers, flags topics missing from the syllabus, and uses sources when writing", async () => {
    const { addSource } = await import("@/lib/question-factory/knowledge");
    const { createBatch } = await import("@/lib/question-factory/engine");
    await addSource(db, { exam: "SSC CGL", subject: "Logical Reasoning", kind: "syllabus", title: "Tier I reasoning syllabus", body: "Logical Reasoning covers analogy, classification, series, coding decoding, blood relations and direction sense." });
    await addSource(db, { exam: "SSC CGL", subject: "Logical Reasoning", kind: "pyq", title: "2023 shift 1", body: "1. Find the odd one out from the given alternatives: Apple, Mango, Potato, Banana.\n\n2. Choose the number that completes the series: 2, 6, 12, 20, 30, ?" });

    const questions: Q[] = [
      { question: "Find the odd one out from the given alternatives: Apple, Mango, Potato, Banana.", options: { A: "Apple", B: "Mango", C: "Potato", D: "Banana" }, correct_answer: "C" },
      { question: "Pointing to a girl, Ravi says she is the daughter of my mother's only brother. How is she related to Ravi?", options: { A: "Sister", B: "Cousin", C: "Aunt", D: "Niece" }, correct_answer: "B" }
    ];
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Logical Reasoning", topic: "Blood relations", difficulty: "moderate", count: 2, mode: "queue" });
    const seenPrompts: string[] = [];
    const respond = answerer(questions, "Logical Reasoning", "Blood relations", {
      write: (task) => {
        seenPrompts.push(task.request.prompt);
        return { questions: questions.map((q) => full(q, "Logical Reasoning", "Blood relations")) };
      }
    });
    const done = await drain(id, respond);
    expect(done.status).toBe("completed");
    expect(seenPrompts[0]).toContain("analogy, classification");
    expect(seenPrompts[0]).toContain("Never copy");

    const rows = await db.query<{ stem: string; validation_status: string }>("select stem, validation_status from questions where batch_id = $1", [id]);
    expect(rows.rows.find((row) => row.stem.startsWith("Find the odd one out"))!.validation_status).toBe("rejected");
    expect(rows.rows.find((row) => row.stem.startsWith("Pointing to a girl"))!.validation_status).toBe("auto_passed");
  });

  it("splits past papers into questions and matches topics to a syllabus", () => {
    expect(pyqStems("1. First question about percentages and ratios?\n\n2) Second question about speed and distance?")).toHaveLength(2);
    expect(topicInSyllabus("Covers blood relations and coding decoding", "Blood relations")).toBe(true);
    expect(topicInSyllabus("Covers blood relations and coding decoding", "Astrophysics")).toBe(false);
    expect(topicInSyllabus("", "Anything")).toBeNull();
  });
});

describe("language rules and chat hand-off", () => {
  it("fixes spacing, doubled words and common misspellings without touching meaning", () => {
    const result = proofread("the  government will  recieve the the  report , tommorow.");
    expect(result.text).toBe("The government will receive the report, tomorrow.");
    expect(result.fixes.length).toBeGreaterThan(2);
    expect(proofread("Choose (the best option").issues).toHaveLength(1);
    expect(proofread("kilometres", { capitalise: false }).text).toBe("kilometres");
  });

  it("round trips tasks through a chat message and reads the pasted reply", () => {
    const message = tasksToChatMessage([{ id: "abc", batch_id: "b", stage: "solve", request: { system: "Solver role", prompt: "Solve this." } }]);
    expect(message).toContain("id: abc");
    expect(message).toContain("Solver role");
    const answers = parseChatAnswers('Here you go:\n```json\n[{"id":"abc","response":{"answer":"B"}}]\n```');
    expect(answers).toEqual([{ id: "abc", response: '{"answer":"B"}' }]);
    expect(() => parseChatAnswers("no list here")).toThrow();
  });
});
