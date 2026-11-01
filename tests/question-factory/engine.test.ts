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

// A worked solution that ends at the keyed option, which the explanation check requires.
const worked = (letter: string, value: string) => `Key idea: work the steps out.\nStep 1: Read the values from the question.\nStep 2: Apply the rule to reach the keyed option.\nAnswer: (${letter}) ${value}\nWhy not the others: they come from common slips.`;

const full = (q: Q, subject: string, topic: string) => ({
  exam: "SSC CGL", tier: "Tier I", subject, topic, difficulty: "moderate", explanation: worked(q.correct_answer, q.options[q.correct_answer]), estimated_time_seconds: 60, ...q
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
      return { ok: true, issues: [], question: stem, in_syllabus: true, level: "as_expected", reason: "Standard topic." };
    }
    if (task.stage === "fix") return { ...repaired, explanation: "Key idea: find a percent of a number.\nStep 1: 15% of 400 = 15 x 400 / 100.\nStep 2: That is 60.\nAnswer: (C) 60\nWhy not the others: the other options come from mis-placing the decimal." };
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

  it("sends a question to the fixer when the reviewer finds a wrong step in the explanation", async () => {
    const { createBatch } = await import("@/lib/question-factory/engine");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Sums", difficulty: "moderate", count: 1, mode: "queue" });
    const one: Q = { question: "The sum of 45 and 55 is divided by 4. What is the result exactly?", options: { A: "20", B: "25", C: "30", D: "35" }, correct_answer: "B", verification_expression: "(45 + 55) / 4" };
    let reviewed = 0;
    const respond = answerer([one], "Quantitative Aptitude", "Sums", {
      review: (task) => {
        const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
        reviewed++;
        // The first review finds a wrong step; the repaired version then passes.
        return reviewed === 1 ? { ok: true, issues: [], question: stem, steps_ok: false, step_errors: ["Step 2: 100 / 4 is 25, not 20."] } : { ok: true, issues: [], question: stem, steps_ok: true, step_errors: [], in_syllabus: true, level: "as_expected", reason: "Fine." };
      },
      fix: () => ({ ...one, explanation: worked("B", "25") })
    });
    const done = await drain(id, respond);
    expect(done.status).toBe("completed");
    const row = (await db.query<{ validation_status: string; fix_attempts: number }>("select validation_status, fix_attempts from questions where batch_id = $1", [id])).rows[0];
    expect(row.fix_attempts).toBe(1);
    expect(row.validation_status).toBe("auto_passed");
    const events = await db.query<{ message: string }>("select message from factory_events where batch_id = $1 and stage = 'review'", [id]);
    expect(events.rows.some((event) => /error in the explanation/i.test(event.message))).toBe(true);
  });

  it("catches a question that leans on a missing chart and the fixer rewrites it with a text table", async () => {
    const { createBatch } = await import("@/lib/question-factory/engine");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Data tables", difficulty: "moderate", count: 1, mode: "queue" });
    const chart: Q = { question: "Study the pie chart given here and find the profit in 2020 if sales were 150 and cost was 120.", options: { A: "20", B: "30", C: "40", D: "50" }, correct_answer: "B", verification_expression: "150 - 120" };
    const withTable = "The table shows sales and cost.\n| Year | Sales | Cost |\n|---|---|---|\n| 2020 | 150 | 120 |\nWhat was the profit in 2020?";
    const respond = answerer([chart], "Quantitative Aptitude", "Data tables", {
      solve: () => ({ answer: "B", reasoning: "150 - 120 = 30", ambiguous: false }),
      review: () => ({ ok: true, issues: [], steps_ok: true, step_errors: [], in_syllabus: true, level: "as_expected", reason: "Fine." }),
      fix: () => ({ question: withTable, options: chart.options, correct_answer: "B", explanation: worked("B", "30"), estimated_time_seconds: 60, verification_expression: "150 - 120" })
    });
    const done = await drain(id, respond);
    expect(done.status).toBe("completed");
    const row = (await db.query<{ validation_status: string; stem: string; fix_attempts: number }>("select validation_status, stem, fix_attempts from questions where batch_id = $1", [id])).rows[0];
    expect(row.fix_attempts).toBe(1);
    expect(row.validation_status).toBe("auto_passed");
    expect(row.stem).toContain("| Year | Sales | Cost |");
    const events = await db.query<{ message: string }>("select message from factory_events where batch_id = $1 and stage = 'solve'", [id]);
    expect(events.rows.some((event) => /graph or chart/i.test(event.message))).toBe(true);
  });

  it("sends a question to a person when the independent solver keeps disagreeing", async () => {
    const stubborn: Q = { question: "A tank fills in 6 hours and empties in 12 hours. How long does it take to fill when both pipes run?", options: { A: "10", B: "12", C: "14", D: "16" }, correct_answer: "B", verification_expression: "(6 * 12) / (12 - 6)" };
    const { createBatch } = await import("@/lib/question-factory/engine");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Pipes", difficulty: "moderate", count: 1, mode: "queue" });
    let n = 0;
    const respond = answerer([stubborn], "Quantitative Aptitude", "Pipes", {
      solve: () => ({ answer: "A", reasoning: "disagrees", ambiguous: false }),
      fix: () => ({ ...stubborn, explanation: "Key idea: add the rates of both pipes.\nStep 1: Pipe A fills 1/20 and pipe B fills 1/30 in an hour.\nStep 2: Together they fill 1/12 per hour, so twelve hours.\nAnswer: (B) 12 hours\nWhy not the others: they average or subtract the times.", question: `${stubborn.question} Round ${++n}.` })
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

describe("re-checking existing questions", () => {
  const thin = "The sum is 100 and one quarter of it is 25.";
  const topic = "Recheck topic";

  async function insertExisting(stem: string, options: Record<"A" | "B" | "C" | "D", string>, correct: string, explanation: string, status: string, source: string, expression: string | null) {
    const { ensureExam } = await import("@/lib/question-factory/pipeline");
    const { contentHash } = await import("@/lib/tests/question-schema");
    const examId = await ensureExam(db, "SSC CGL");
    const notes = expression ? { verification_expression: expression } : {};
    const result = await db.query<{ id: string }>(
      `insert into questions (exam_id, tier, subject, topic, difficulty, stem, options, correct_option, explanation, est_time_seconds, source_type, validation_status, validation_notes, content_hash)
       values ($1, 'Tier I', 'Quantitative Aptitude', $2, 'moderate', $3, $4, $5, $6, 60, $7, $8, $9, $10) returning id`,
      [examId, topic, stem, JSON.stringify(options), correct, explanation, source, status, JSON.stringify(notes), contentHash({ question: stem, options })]
    );
    return result.rows[0].id;
  }

  it("rewrites a weak solution without changing the question, and leaves published, human-written and approved questions alone", async () => {
    const opts = { A: "20", B: "25", C: "30", D: "35" };
    const weakId = await insertExisting("Recheck alpha: one quarter of the sum of 45 and 55 equals which number?", opts, "B", thin, "needs_review", "original_ai_generated", "(45 + 55) / 4");
    const goodId = await insertExisting("Recheck beta: half of the sum of 30 and 70 equals which number?", { A: "40", B: "45", C: "50", D: "55" }, "C", worked("C", "50"), "auto_passed", "original_ai_generated", "(30 + 70) / 2");
    const publishedId = await insertExisting("Recheck gamma: a tenth of the sum of 60 and 40 equals which number?", { A: "5", B: "10", C: "15", D: "20" }, "B", thin, "published", "original_ai_generated", "(60 + 40) / 10");
    const humanId = await insertExisting("Recheck delta: a fifth of the sum of 60 and 40 equals which number?", { A: "10", B: "15", C: "20", D: "25" }, "C", thin, "needs_review", "human_authored", "(60 + 40) / 5");
    const approvedId = await insertExisting("Recheck epsilon: a twentieth of the sum of 60 and 40 equals which number?", { A: "2", B: "3", C: "4", D: "5" }, "D", thin, "approved", "original_ai_generated", "(60 + 40) / 20");

    const { recheckQuestions } = await import("@/lib/question-factory/engine");
    const { id, count } = await recheckQuestions(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic, mode: "queue", limit: 100, includeApproved: false });
    expect(count).toBe(2);

    const keys: Record<string, string> = { [`Recheck alpha: one quarter of the sum of 45 and 55 equals which number?`]: "B", [`Recheck beta: half of the sum of 30 and 70 equals which number?`]: "C" };
    const done = await drain(id, (task) => {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      if (task.stage === "solve") return { answer: keys[stem] ?? "A", reasoning: "worked out", ambiguous: false };
      if (task.stage === "review") return { ok: true, issues: [], question: stem, steps_ok: true, step_errors: [], in_syllabus: true, level: "as_expected", reason: "Fine." };
      if (task.stage === "fix") return { explanation: worked("B", "25") };
      throw new Error(`Unexpected stage ${task.stage}`);
    });
    expect(done.status).toBe("completed");

    type Row = { id: string; validation_status: string; stem: string; explanation: string; fix_attempts: number; batch_id: string | null; correct_option: string };
    const read = async (qid: string) => (await db.query<Row>("select id, validation_status, stem, explanation, fix_attempts, batch_id, correct_option from questions where id = $1", [qid])).rows[0];

    const weak = await read(weakId);
    expect(weak.validation_status).toBe("auto_passed");
    expect(weak.fix_attempts).toBe(1);
    expect(weak.stem).toContain("Recheck alpha");
    expect(weak.correct_option).toBe("B");
    expect(weak.explanation).toContain("Answer: (B) 25");

    const good = await read(goodId);
    expect(good.validation_status).toBe("auto_passed");
    expect(good.fix_attempts).toBe(0);
    expect(good.explanation).toBe(worked("C", "50"));

    for (const untouched of [publishedId, humanId, approvedId]) {
      const row = await read(untouched);
      expect(row.batch_id).toBeNull();
      expect(row.explanation).toBe(thin);
    }
    expect((await read(publishedId)).validation_status).toBe("published");
    expect((await read(humanId)).validation_status).toBe("needs_review");
    expect((await read(approvedId)).validation_status).toBe("approved");

    const events = await db.query<{ message: string }>("select message from factory_events where batch_id = $1 and stage = 'fix'", [id]);
    expect(events.rows.some((event) => /Rewrote the explanation/.test(event.message))).toBe(true);
  });

  it("refuses when nothing matches", async () => {
    const { recheckQuestions } = await import("@/lib/question-factory/engine");
    await expect(recheckQuestions(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "No such topic", mode: "queue", limit: 10, includeApproved: false })).rejects.toThrow(/No questions match/);
  });
});

describe("data sets", () => {
  // One bar-chart data set with five questions whose answers are computed from the three yearly values.
  function dataSet(title: string, [a, b, c]: [number, number, number]) {
    const q = (question: string, answer: number, expression: string, suffix = "") => ({
      question, options: { A: `${answer - 10}${suffix}`, B: `${answer}${suffix}`, C: `${answer + 10}${suffix}`, D: `${answer + 20}${suffix}` }, correct_answer: "B", difficulty: "moderate",
      explanation: worked("B", `${answer}${suffix}`), estimated_time_seconds: 70, verification_expression: expression
    });
    return {
      title, intro: "Sales of a shop over three years.", table: null,
      chart: { type: "bar", title: "Sales by year", unit: "₹ lakh", categories: ["2019", "2020", "2021"], series: [{ name: "Sales", values: [a, b, c] }] },
      questions: [
        q("By how much did sales rise from 2019 to 2020?", b - a, `${b} - ${a}`),
        q("By what percent did sales rise from 2020 to 2021?", ((c - b) / b) * 100, `(${c} - ${b}) / ${b} * 100`, "%"),
        q("What is the average sales over the three years?", (a + b + c) / 3, `(${a} + ${b} + ${c}) / 3`),
        q("What is the total sales over the three years?", a + b + c, `${a} + ${b} + ${c}`),
        q("By how much did sales in 2021 exceed sales in 2019?", c - a, `${c} - ${a}`)
      ]
    };
  }

  async function runSet(values: [number, number, number], title: string) {
    const { advanceBatch, createBatch, queueAi } = await import("@/lib/question-factory/engine");
    const { pendingTasks } = await import("@/lib/question-factory/queue");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Data Interpretation", difficulty: "moderate", count: 5, mode: "queue", format: "set", setKind: "bar" });
    expect((await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 }))?.status).toBe("waiting_ai");
    const first = await pendingTasks(db, { batchId: id });
    expect(first.map((task) => task.stage)).toEqual(["write"]);
    expect(first[0].request.prompt).toContain("Data Interpretation sets");
    expect(first[0].request.prompt).toContain("bar chart");

    const done = await drain(id, (task) => {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      if (task.stage === "write") return { sets: [dataSet(title, values)] };
      // The solver cannot see a picture, so it must be given the chart's numbers as text.
      if (task.stage === "solve") {
        if (!task.request.prompt.includes("Data set:") || !task.request.prompt.includes(`| 2020 | ${values[1]} |`)) throw new Error("The solver was not given the data");
        return { answer: "B", reasoning: "worked out from the data", ambiguous: false };
      }
      if (task.stage === "review") {
        if (!task.request.prompt.includes("Data set:")) throw new Error("The reviewer was not given the data");
        return { ok: true, issues: [], question: stem, steps_ok: true, step_errors: [], in_syllabus: true, level: "as_expected", reason: "Fine." };
      }
      throw new Error(`Unexpected stage ${task.stage}`);
    });
    expect(done.status).toBe("completed");
    return id;
  }

  it("writes a set, shows the solver the data as text, and links every question to the set", async () => {
    const id = await runSet([120, 150, 180], "Shop sales A");
    const rows = await db.query<{ validation_status: string; set_id: string | null; set_position: number | null; stem: string }>("select validation_status, set_id, set_position, stem from questions where batch_id = $1 order by set_position", [id]);
    expect(rows.rows).toHaveLength(5);
    expect(rows.rows.every((row) => row.validation_status === "auto_passed")).toBe(true);
    expect(new Set(rows.rows.map((row) => row.set_id)).size).toBe(1);
    expect(rows.rows.map((row) => row.set_position)).toEqual([0, 1, 2, 3, 4]);
    const set = (await db.query<{ title: string; chart: { type: string; categories: string[] } }>("select title, chart from question_sets where id = $1", [rows.rows[0].set_id])).rows[0];
    expect(set.title).toBe("Shop sales A");
    expect(set.chart.type).toBe("bar");
    expect(set.chart.categories).toEqual(["2019", "2020", "2021"]);
  });

  it("does not call a question a repeat just because another set asks the same thing about different data", async () => {
    const id = await runSet([90, 120, 180], "Shop sales B");
    const rows = await db.query<{ validation_status: string; set_id: string | null }>("select validation_status, set_id from questions where batch_id = $1", [id]);
    expect(rows.rows).toHaveLength(5);
    expect(rows.rows.every((row) => row.validation_status === "auto_passed")).toBe(true);
    expect(Number((await db.query<{ n: string }>("select count(*) as n from question_sets where title like 'Shop sales%'")).rows[0].n)).toBe(2);
  });

  it("drops a set whose chart is not usable and says why", async () => {
    const { createBatch, advanceBatch, queueAi } = await import("@/lib/question-factory/engine");
    const { answerTasks, pendingTasks } = await import("@/lib/question-factory/queue");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Data Interpretation", difficulty: "moderate", count: 5, mode: "queue", format: "set" });
    await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    const [task] = await pendingTasks(db, { batchId: id });
    const bad = { ...dataSet("Broken chart", [1, 2, 3]), chart: { type: "donut", title: "x", categories: ["a"], series: [] } };
    await answerTasks(db, [{ id: task.id, response: JSON.stringify({ sets: [bad] }) }], "test");
    await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    const events = await db.query<{ message: string }>("select message from factory_events where batch_id = $1 and stage = 'write'", [id]);
    expect(events.rows.some((event) => /data set was dropped: The chart is not valid/.test(event.message))).toBe(true);
    expect(Number((await db.query<{ n: string }>("select count(*) as n from question_sets where title = 'Broken chart'")).rows[0].n)).toBe(0);
  });

  it("refuses data sets without an AI", async () => {
    const { createBatch } = await import("@/lib/question-factory/engine");
    await expect(createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", difficulty: "moderate", count: 5, mode: "rules", format: "set" })).rejects.toThrow(/chat queue or an AI API/);
  });
});

describe("figures", () => {
  // A right-angled triangle drawn to match its labels. Shifting it makes a different figure with the same wording.
  const triangle = (shift: number) => ({
    type: "geometry",
    points: [{ name: "A", x: 10 + shift, y: 60 }, { name: "B", x: 10 + shift, y: 10 }, { name: "C", x: 45 + shift, y: 10 }],
    lines: [{ from: "A", to: "B" }, { from: "B", to: "C" }, { from: "A", to: "C" }],
    angles: [{ at: "B", from: "A", to: "C", label: "90°" }, { at: "A", from: "B", to: "C", label: "35°" }]
  });
  const written = (figure: unknown) => ({
    exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Triangles", difficulty: "moderate",
    question: "In the figure, angle ABC is 90 degrees and angle BAC is 35 degrees. Find angle ACB.",
    options: { A: "45°", B: "55°", C: "65°", D: "35°" }, correct_answer: "B", explanation: worked("B", "55°"), estimated_time_seconds: 60,
    verification_expression: "180 - 90 - 35", figure
  });

  async function start(figures: boolean) {
    const { createBatch } = await import("@/lib/question-factory/engine");
    return createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", topic: "Triangles", difficulty: "moderate", count: 2, mode: "queue", figures });
  }

  it("tells the writer how to describe a figure only when the run allows one", async () => {
    const { advanceBatch, queueAi } = await import("@/lib/question-factory/engine");
    const { pendingTasks } = await import("@/lib/question-factory/queue");
    const withFigures = await start(true);
    await advanceBatch(db, queueAi(db), withFigures, { budgetMs: 3000 });
    const [task] = await pendingTasks(db, { batchId: withFigures });
    expect(task.request.prompt).toContain('"type":"venn"');
    expect(task.request.prompt).toContain('"type":"geometry"');
    expect(task.request.prompt).not.toContain("Learners see text only");

    const without = await start(false);
    await advanceBatch(db, queueAi(db), without, { budgetMs: 3000 });
    const [plain] = await pendingTasks(db, { batchId: without });
    expect(plain.request.prompt).not.toContain('"type":"geometry"');
    expect(plain.request.prompt).toContain("Learners see text only");
  });

  it("stores the figure, shows it to the solver and reviewer as text, and keeps different figures apart", async () => {
    const id = await start(true);
    const done = await drain(id, (task) => {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      if (task.stage === "write") return { questions: [written(triangle(0)), written(triangle(20))] };
      if (task.stage === "solve" || task.stage === "review") {
        // Neither can see a drawing, so both must be given the figure as text.
        if (!task.request.prompt.includes("Geometry figure (not drawn to scale)") || !task.request.prompt.includes("∠BAC = 35°")) throw new Error(`The ${task.stage} stage was not given the figure`);
      }
      if (task.stage === "solve") return { answer: "B", reasoning: "180 - 90 - 35 = 55", ambiguous: false };
      if (task.stage === "review") return { ok: true, issues: [], question: stem, steps_ok: true, step_errors: [], in_syllabus: true, level: "as_expected", reason: "Fine." };
      throw new Error(`Unexpected stage ${task.stage}`);
    });
    expect(done.status).toBe("completed");
    const rows = await db.query<{ validation_status: string; figure: { type: string; points: Array<{ x: number }> } | null }>("select validation_status, figure from questions where batch_id = $1 order by created_at", [id]);
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.every((row) => row.validation_status === "auto_passed")).toBe(true);
    expect(rows.rows.every((row) => row.figure?.type === "geometry")).toBe(true);
    expect(new Set(rows.rows.map((row) => row.figure?.points[0].x)).size).toBe(2);
  });

  it("drops a question whose figure is not valid and says why", async () => {
    const { advanceBatch, queueAi } = await import("@/lib/question-factory/engine");
    const { answerTasks, pendingTasks } = await import("@/lib/question-factory/queue");
    const id = await start(true);
    await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    const [task] = await pendingTasks(db, { batchId: id });
    const broken = written({ type: "geometry", points: [{ name: "A", x: 10, y: 10 }, { name: "B", x: 50, y: 50 }], lines: [{ from: "A", to: "Z" }], circles: [], angles: [] });
    await answerTasks(db, [{ id: task.id, response: JSON.stringify({ questions: [broken] }) }], "test");
    await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    const events = await db.query<{ message: string }>("select message from factory_events where batch_id = $1 and stage = 'write'", [id]);
    expect(events.rows.some((event) => /its figure was not valid.*not listed/.test(event.message))).toBe(true);
    expect(Number((await db.query<{ n: string }>("select count(*) as n from questions where batch_id = $1", [id])).rows[0].n)).toBe(0);
  });

  it("ignores a figure when the run does not allow one, so a question that needs it fails the check", async () => {
    const { advanceBatch, queueAi } = await import("@/lib/question-factory/engine");
    const { answerTasks, pendingTasks } = await import("@/lib/question-factory/queue");
    const id = await start(false);
    await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    const [task] = await pendingTasks(db, { batchId: id });
    await answerTasks(db, [{ id: task.id, response: JSON.stringify({ questions: [written(triangle(0))] }) }], "test");
    await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    const row = (await db.query<{ figure: unknown; pipeline_stage: string; validation_notes: { reasons?: string[]; checks?: Array<{ name: string; passed: boolean }> } }>("select figure, pipeline_stage, validation_notes from questions where batch_id = $1", [id])).rows[0];
    expect(row.figure).toBeNull();
    expect(row.pipeline_stage).toBe("fixing");
    expect(row.validation_notes.reasons?.[0]).toMatch(/figure, diagram or picture/);
  });

  it("refuses figures without an AI", async () => {
    const { createBatch } = await import("@/lib/question-factory/engine");
    await expect(createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", difficulty: "moderate", count: 5, mode: "rules", figures: true })).rejects.toThrow(/Figures need the chat queue/);
  });
});

describe("passage sets", () => {
  const passage = [
    "Cities across the country are rethinking how people travel. For decades, planners built wider roads on the belief that more lanes would end congestion. The result was often the opposite: new roads attracted more cars, and the traffic soon returned.",
    "A growing number of cities now invest in buses, cycling lanes and safe footpaths instead. Early results are encouraging. Travel times for bus passengers have fallen, local shops report more customers on foot, and the air near busy junctions is cleaner than it was a decade ago.",
    "Critics warn that the change will not work everywhere. Small towns with long distances between homes and workplaces still depend on private vehicles. Supporters reply that no single answer suits every place, and that the real lesson is to plan for people rather than for cars."
  ].join("\n\n");

  const rc = (title: string) => ({
    title, passage,
    questions: [
      ["What is the main idea of the passage?", "B", ["Roads should be made wider", "Cities are shifting from building roads to supporting other ways of travel", "Small towns should ban cars", "Air quality is the only concern"]],
      ["According to the passage, what happened after new roads were built?", "A", ["Traffic soon returned", "Travel times fell", "Shops closed", "Buses stopped running"]],
      ["Which of these can be inferred about small towns?", "C", ["They have no buses", "They dislike cycling", "They still rely on private vehicles", "They have clean air"]],
      ["The word 'encouraging' as used in the passage most nearly means", "D", ["worrying", "confusing", "expensive", "promising"]],
      ["The writer's tone towards the new approach is best described as", "B", ["hostile", "cautiously positive", "indifferent", "sarcastic"]]
    ].map(([question, answer, options], index) => {
      const letters = ["A", "B", "C", "D"] as const;
      const list = options as string[];
      return {
        question, options: { A: list[0], B: list[1], C: list[2], D: list[3] }, correct_answer: answer, difficulty: "moderate",
        explanation: worked(answer as string, list[letters.indexOf(answer as "A")]), estimated_time_seconds: 75 + index
      };
    })
  });

  async function start(kind: "passage" | "cloze") {
    const { createBatch } = await import("@/lib/question-factory/engine");
    return createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "English Language", difficulty: "moderate", count: 5, mode: "queue", format: "set", setKind: kind });
  }

  it("asks for an original passage and five questions, with no arithmetic expression", async () => {
    const { advanceBatch, queueAi } = await import("@/lib/question-factory/engine");
    const { pendingTasks } = await import("@/lib/question-factory/queue");
    const id = await start("passage");
    await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    const [task] = await pendingTasks(db, { batchId: id });
    expect(task.request.prompt).toContain("reading comprehension sets");
    expect(task.request.prompt).toContain('"passage"');
    expect(task.request.prompt).not.toContain("verification_expression");
    expect(task.request.system).toContain("Never reproduce");
    const cloze = await start("cloze");
    await advanceBatch(db, queueAi(db), cloze, { budgetMs: 3000 });
    expect((await pendingTasks(db, { batchId: cloze }))[0].request.prompt).toContain("(1) ______");
  });

  it("stores the passage as a set, gives the solver and reviewer the passage as text, and links the questions", async () => {
    const id = await start("passage");
    const done = await drain(id, (task) => {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      if (task.stage === "write") return { sets: [rc("City travel")] };
      if (task.stage === "solve" || task.stage === "review") {
        if (!task.request.prompt.includes("Passage: City travel") || !task.request.prompt.includes("plan for people rather than for cars")) throw new Error(`The ${task.stage} stage was not given the passage`);
      }
      if (task.stage === "solve") {
        const wanted = rc("City travel").questions.find((q) => q.question === stem);
        return { answer: wanted?.correct_answer ?? "A", reasoning: "from the passage", ambiguous: false };
      }
      if (task.stage === "review") return { ok: true, issues: [], question: stem, steps_ok: true, step_errors: [], in_syllabus: true, level: "as_expected", reason: "Fine." };
      throw new Error(`Unexpected stage ${task.stage}`);
    });
    expect(done.status).toBe("completed");
    const rows = await db.query<{ validation_status: string; set_id: string }>("select validation_status, set_id from questions where batch_id = $1", [id]);
    expect(rows.rows).toHaveLength(5);
    expect(rows.rows.every((row) => row.validation_status === "auto_passed")).toBe(true);
    const set = (await db.query<{ kind: string; topic: string; stimulus: string; chart: unknown }>("select kind, topic, stimulus, chart from question_sets where id = $1", [rows.rows[0].set_id])).rows[0];
    expect(set).toMatchObject({ kind: "passage", topic: "Reading Comprehension", chart: null });
    expect(set.stimulus).toContain("plan for people rather than for cars");
  });

  it("drops a passage that is too short and a cloze passage with no blanks, and says why", async () => {
    const { advanceBatch, queueAi } = await import("@/lib/question-factory/engine");
    const { answerTasks, pendingTasks } = await import("@/lib/question-factory/queue");
    const short = await start("passage");
    await advanceBatch(db, queueAi(db), short, { budgetMs: 3000 });
    const [shortTask] = await pendingTasks(db, { batchId: short });
    await answerTasks(db, [{ id: shortTask.id, response: JSON.stringify({ sets: [{ ...rc("Too short"), passage: "A very short passage." }] }) }], "test");
    await advanceBatch(db, queueAi(db), short, { budgetMs: 3000 });
    const shortEvents = await db.query<{ message: string }>("select message from factory_events where batch_id = $1 and stage = 'write'", [short]);
    expect(shortEvents.rows.some((event) => /passage set was dropped: The passage is too short/.test(event.message))).toBe(true);

    const cloze = await start("cloze");
    await advanceBatch(db, queueAi(db), cloze, { budgetMs: 3000 });
    const [clozeTask] = await pendingTasks(db, { batchId: cloze });
    await answerTasks(db, [{ id: clozeTask.id, response: JSON.stringify({ sets: [rc("No blanks")] }) }], "test");
    await advanceBatch(db, queueAi(db), cloze, { budgetMs: 3000 });
    const clozeEvents = await db.query<{ message: string }>("select message from factory_events where batch_id = $1 and stage = 'write'", [cloze]);
    expect(clozeEvents.rows.some((event) => /needs numbered blanks/.test(event.message))).toBe(true);
    expect(Number((await db.query<{ n: string }>("select count(*) as n from question_sets where title in ('Too short', 'No blanks')")).rows[0].n)).toBe(0);
  });
});

describe("Tier II subjects", () => {
  it("treats Mathematical Abilities like Quantitative Aptitude, and Statistics as a subject the solver checks", async () => {
    const { generationPrompt } = await import("@/lib/question-factory/prompts");
    const { isNumericSubject } = await import("@/lib/question-factory/validator");
    const base = { exam: "SSC CGL", tier: "Tier II", difficulty: "moderate", count: 2, topic: "Mean" };
    expect(isNumericSubject("Mathematical Abilities")).toBe(true);
    expect(isNumericSubject("Statistics")).toBe(false);
    expect(generationPrompt({ ...base, subject: "Mathematical Abilities" }).prompt).toContain("verification_expression");
    expect(generationPrompt({ ...base, subject: "Statistics" }).prompt).not.toContain("a plain arithmetic expression");
  });

  it("always sends Finance and Economics questions to a person, even when the solver agrees", async () => {
    const { createBatch } = await import("@/lib/question-factory/engine");
    const id = await createBatch(db, { exam: "SSC CGL", tier: "Tier II", subject: "Finance and Economics", topic: "Demand and Supply", difficulty: "moderate", count: 1, mode: "queue" });
    const concept: Q = { question: "When the price of a normal good falls and nothing else changes, what happens to the quantity demanded of it?", options: { A: "It rises", B: "It falls", C: "It stays the same", D: "It first falls and then rises" }, correct_answer: "A" };
    const done = await drain(id, answerer([concept], "Finance and Economics", "Demand and Supply", { solve: () => ({ answer: "A", reasoning: "law of demand", ambiguous: false }) }));
    expect(done.status).toBe("completed");
    const row = (await db.query<{ validation_status: string }>("select validation_status from questions where batch_id = $1", [id])).rows[0];
    expect(row.validation_status).toBe("needs_review");
  });

  it("lists suggested topics for every Tier I and Tier II section", async () => {
    const { subjectGuide } = await import("@/lib/question-factory/subjects");
    expect(subjectGuide.map((item) => item.subject)).toEqual(expect.arrayContaining(["Quantitative Aptitude", "English Comprehension", "Mathematical Abilities", "Statistics", "Finance and Economics", "Computer Knowledge"]));
    expect(subjectGuide.every((item) => item.topics.length >= 10 && new Set(item.topics).size === item.topics.length)).toBe(true);
  });
});

describe("dated current affairs", () => {
  const noteTitle = "Sports roundup Oct 2026";
  const noteBody = "The 2026 national games were held in October 2026 and the host state won the overall trophy with 120 medals. The marathon was won by a runner from Kenya.";
  const dated = {
    exam: "SSC CGL", tier: "Tier I", subject: "General Awareness", topic: "Current Affairs", difficulty: "moderate",
    question: "Which state won the overall trophy at the national games held in October 2026?",
    options: { A: "The host state", B: "Kerala", C: "Punjab", D: "Odisha" }, correct_answer: "A",
    explanation: worked("A", "The host state"), estimated_time_seconds: 40,
    source: noteTitle, as_of: "2026-10-20", shelf_life_months: 12
  };

  async function start() {
    const { addSource } = await import("@/lib/question-factory/knowledge");
    const { createBatch } = await import("@/lib/question-factory/engine");
    if (!(await db.query("select 1 from knowledge_sources where title = $1", [noteTitle])).rowCount) {
      await addSource(db, { exam: "SSC CGL", subject: "General Awareness", kind: "current_affairs", title: noteTitle, body: noteBody, asOf: "2026-10-20" });
    }
    return createBatch(db, { exam: "SSC CGL", tier: "Tier I", subject: "General Awareness", topic: "Current Affairs", difficulty: "moderate", count: 1, mode: "queue" });
  }

  const solve = () => ({ answer: "A", reasoning: "from the note", ambiguous: false });
  const review = (stem: string, extra: Record<string, unknown> = {}) => ({ ok: true, issues: [], question: stem, steps_ok: true, step_errors: [], in_syllabus: true, level: "as_expected", reason: "Fine.", ...extra });

  it("tells the writer to use only the notes and to cite and date each question", async () => {
    const { advanceBatch, queueAi } = await import("@/lib/question-factory/engine");
    const { pendingTasks } = await import("@/lib/question-factory/queue");
    const id = await start();
    await advanceBatch(db, queueAi(db), id, { budgetMs: 3000 });
    const [task] = await pendingTasks(db, { batchId: id });
    expect(task.request.prompt).toContain(`[Source: ${noteTitle}, as of 2026-10-20]`);
    expect(task.request.prompt).toContain("Use ONLY facts stated in the source notes");
    expect(task.request.prompt).toContain('"shelf_life_months"');
  });

  it("stores the source and dates, and checks the answer against the cited note", async () => {
    const id = await start();
    let reviewPrompt = "";
    await drain(id, (task) => {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      if (task.stage === "write") return { questions: [dated] };
      if (task.stage === "solve") return solve();
      reviewPrompt = task.request.prompt;
      return review(stem, { supported: true, evidence: "the host state won the overall trophy" });
    });
    expect(reviewPrompt).toContain(noteBody);
    expect(reviewPrompt).toContain('"supported": true only if the note itself states the keyed answer');
    const row = (await db.query<{ fact_as_of: string; valid_until: string; source_title: string; validation_status: string; validation_notes: { flags?: string[] } }>("select fact_as_of::text, valid_until::text, source_title, validation_status, validation_notes from questions where batch_id = $1", [id])).rows[0];
    expect(row).toMatchObject({ fact_as_of: "2026-10-20", valid_until: "2027-10-20", source_title: noteTitle, validation_status: "needs_review" });
    expect((row.validation_notes.flags ?? []).some((flag) => /no source note or date/.test(flag))).toBe(false);
  });

  it("sends a question to the fixer when the note does not state the answer, with the note in front of the fixer", async () => {
    const id = await start();
    const question = "Which state topped the medal table at the national games of October 2026, according to the roundup?";
    let fixPrompt = "";
    let reviews = 0;
    const done = await drain(id, (task) => {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      if (task.stage === "write") return { questions: [{ ...dated, question }] };
      if (task.stage === "solve") return solve();
      if (task.stage === "review") {
        reviews++;
        // The first review finds that the note does not say this; once the fixer has rewritten it, the note supports it.
        return review(stem, reviews === 1 ? { supported: false, evidence: "The note names no state apart from the host." } : { supported: true, evidence: "the host state won" });
      }
      fixPrompt = task.request.prompt;
      return { question: `${question} Answer from the note.`, options: dated.options, correct_answer: "A", explanation: dated.explanation, estimated_time_seconds: 40 };
    });
    expect(done.status).toBe("completed");
    expect(fixPrompt).toContain(`The source note "${noteTitle}" does not state the keyed answer`);
    expect(fixPrompt).toContain("This question must stay inside this source note");
    expect(fixPrompt).toContain(noteBody);
    const row = (await db.query<{ fix_attempts: number; source_title: string }>("select fix_attempts, source_title from questions where batch_id = $1", [id])).rows[0];
    expect(row).toMatchObject({ fix_attempts: 1, source_title: noteTitle });
  });

  it("flags a question that has no source or date", async () => {
    const id = await start();
    await drain(id, (task) => {
      const stem = /Question: (.*)\n/.exec(task.request.prompt)?.[1] ?? "";
      if (task.stage === "write") return { questions: [{ ...dated, question: "Which runner won the marathon at the national games in October 2026, according to the roundup?", options: { A: "A runner from Kenya", B: "A runner from Ethiopia", C: "A runner from Punjab", D: "A runner from Kerala" }, explanation: worked("A", "A runner from Kenya"), source: "", as_of: "", shelf_life_months: 12 }] };
      if (task.stage === "solve") return solve();
      return review(stem);
    });
    const row = (await db.query<{ fact_as_of: string | null; source_title: string | null; validation_notes: { flags?: string[] } }>("select fact_as_of, source_title, validation_notes from questions where batch_id = $1", [id])).rows[0];
    expect(row.fact_as_of).toBeNull();
    expect(row.source_title).toBeNull();
    expect((row.validation_notes.flags ?? []).some((flag) => /no source note or date/.test(flag))).toBe(true);
  });
});
