import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";

process.env.DATABASE_URL = "pglite://memory://";

let db: Db;
let examId = "";
let counter = 0;

beforeAll(async () => {
  const { getDb } = await import("@/lib/db");
  db = (await getDb())!;
  for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await db.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
  examId = (await db.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
});

const explanation = "Key idea: percent of a number.\nStep 1: 15% of 400 = 15 x 400 / 100.\nStep 2: That is 60.\nAnswer: (C) 60\nWhy not the others: they come from slips.";
const hindiExplanation = "मुख्य विचार: किसी संख्या का प्रतिशत।\nचरण 1: 400 का 15% = 15 x 400 / 100।\nचरण 2: यह 60 है।\nउत्तर: (C) 60\nअन्य विकल्प क्यों नहीं: ये गलतियों से आते हैं।";

async function addQuestion(subject: string, overrides: Record<string, unknown> = {}) {
  counter++;
  const row = (await db.query<{ id: string }>(
    `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash, set_id, figure)
     values ($1,$2,'Percentage','moderate',$3,$4,'C',$5,'published',$6,$7,$8) returning id`,
    [examId, subject, (overrides.stem as string) ?? `What is 15 percent of 400 rupees? Variant ${counter}.`, JSON.stringify({ A: "40", B: "50", C: "60", D: "70" }), explanation, `tr-${counter}`, overrides.set_id ?? null, overrides.figure ? JSON.stringify(overrides.figure) : null]
  )).rows[0];
  return row.id;
}

type Task = { id: string; stage: string; request: { system: string; prompt: string } };

// A translator who writes valid Hindi: keeps every number and the structure, and the labels become Hindi.
const goodHindi = (stem: string) => ({ question: `प्रश्न (हिंदी में): ${(stem.match(/\d+/g) ?? []).join(" ")}`, options: { A: "40", B: "50", C: "60", D: "70" }, explanation: hindiExplanation });

async function run(batchId: string, respond: (task: Task) => unknown, rounds = 40) {
  const { advanceTranslation } = await import("@/lib/question-factory/translate");
  const { queueAi } = await import("@/lib/question-factory/engine");
  const { answerTasks, pendingTasks } = await import("@/lib/question-factory/queue");
  for (let round = 0; round < rounds; round++) {
    const batch = await advanceTranslation(db, queueAi(db), batchId, { budgetMs: 4000 });
    if (batch?.status === "completed") return batch;
    const tasks = (await pendingTasks(db, { batchId, limit: 100 })) as Task[];
    if (!tasks.length) continue;
    await answerTasks(db, tasks.map((task) => ({ id: task.id, response: JSON.stringify(respond(task)) })), "test");
  }
  throw new Error("The translation run did not finish");
}

const englishStem = (prompt: string) => /"question": "(.*?)",\n/.exec(prompt)?.[1] ?? "";

async function start(subject: string, limit = 10) {
  const { startTranslation } = await import("@/lib/question-factory/translate");
  return startTranslation(db, { exam: "SSC CGL", tier: "Tier I", subject, mode: "queue", limit });
}

describe("translating to Hindi", () => {
  it("translates, checks the meaning with a blind solver, and leaves the English alone", async () => {
    const questionId = await addQuestion("Translate Basic");
    const { id, count } = await start("Translate Basic");
    expect(count).toBe(1);
    const seen: string[] = [];
    const done = await run(id, (task) => {
      seen.push(task.stage);
      if (task.stage === "translate") return goodHindi(englishStem(task.request.prompt));
      if (task.stage === "verify") {
        // The solver must be given the Hindi, never the English, and no key.
        if (!task.request.prompt.includes("(हिंदी में)") || task.request.prompt.includes("What is 15 percent")) throw new Error("The solver was not given only the Hindi");
        return { answer: "C", reasoning: "15% of 400 is 60", ambiguous: false };
      }
      throw new Error(`Unexpected stage ${task.stage}`);
    });
    expect(done.status).toBe("completed");
    expect(seen).toEqual(["translate", "verify"]);
    const row = (await db.query<{ status: string; stem: string; options: Record<string, string>; model: string }>("select status, stem, options, model from question_translations where question_id = $1", [questionId])).rows[0];
    expect(row.status).toBe("needs_review");
    expect(row.stem).toContain("(हिंदी में)");
    expect(row.options.C).toBe("60");
    const english = (await db.query<{ stem: string; explanation: string }>("select stem, explanation from questions where id = $1", [questionId])).rows[0];
    expect(english.stem).toMatch(/^What is 15 percent/);
    expect(english.explanation).toBe(explanation);
  });

  it("sends a translation that changes a number back, with the reason, and accepts the corrected one", async () => {
    const questionId = await addQuestion("Translate Retry");
    const { id } = await start("Translate Retry");
    const prompts: string[] = [];
    let attempt = 0;
    const done = await run(id, (task) => {
      if (task.stage === "translate") {
        prompts.push(task.request.prompt);
        attempt++;
        const hindi = goodHindi(englishStem(task.request.prompt));
        return attempt === 1 ? { ...hindi, options: { ...hindi.options, C: "65" } } : hindi;
      }
      return { answer: "C", reasoning: "ok", ambiguous: false };
    });
    expect(done.status).toBe("completed");
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).not.toContain("previous translation was rejected");
    expect(prompts[1]).toContain("previous translation was rejected");
    expect(prompts[1]).toContain("numbers in option C differ");
    const row = (await db.query<{ status: string; attempts: number }>("select status, attempts from question_translations where question_id = $1", [questionId])).rows[0];
    expect(row).toMatchObject({ status: "needs_review", attempts: 1 });
  });

  it("fails a translation that keeps breaking the rules, after two tries", async () => {
    const questionId = await addQuestion("Translate Fail");
    const { id } = await start("Translate Fail");
    const done = await run(id, (task) => ({ ...goodHindi(englishStem(task.request.prompt)), explanation: "This is still English." }));
    expect(done.status).toBe("completed");
    const row = (await db.query<{ status: string; attempts: number; notes: { reasons: string[] } }>("select status, attempts, notes from question_translations where question_id = $1", [questionId])).rows[0];
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(2);
    expect(row.notes.reasons[0]).toMatch(/solution is not written in Hindi/);
  });

  it("re-translates when the blind solver reaches a different answer", async () => {
    const questionId = await addQuestion("Translate Meaning");
    const { id } = await start("Translate Meaning");
    let verifies = 0;
    const prompts: string[] = [];
    await run(id, (task) => {
      if (task.stage === "translate") {
        prompts.push(task.request.prompt);
        return goodHindi(englishStem(task.request.prompt));
      }
      verifies++;
      return { answer: verifies === 1 ? "B" : "C", reasoning: "x", ambiguous: false };
    });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("A solver reading only the Hindi chose B but the key is C");
    expect((await db.query<{ status: string }>("select status from question_translations where question_id = $1", [questionId])).rows[0].status).toBe("needs_review");
  });

  it("translates a data set first and gives the solver the Hindi data", async () => {
    const set = (await db.query<{ id: string }>(
      "insert into question_sets (exam_id, subject, topic, difficulty, title, stimulus, chart, content_hash) values ($1,'Translate Set','Data Interpretation','moderate','Shop sales','Sales of a shop.',$2,'trset-1') returning id",
      [examId, JSON.stringify({ type: "bar", title: "Sales by year", unit: "lakh", categories: ["2019", "2020"], series: [{ name: "Sales", values: [120, 150] }] })]
    )).rows[0].id;
    await addQuestion("Translate Set", { set_id: set, stem: "By how much did sales rise from 2019 to 2020? Variant set." });
    const { id } = await start("Translate Set");
    const stages: string[] = [];
    const done = await run(id, (task) => {
      stages.push(task.stage);
      if (task.stage === "translate" && task.request.prompt.includes('"chart"')) {
        return { title: "दुकान की बिक्री", text: "एक दुकान की बिक्री।", chart: { type: "bar", title: "वर्ष के अनुसार बिक्री", unit: "लाख", categories: ["2019", "2020"], series: [{ name: "बिक्री", values: [120, 150] }] } };
      }
      if (task.stage === "translate") return goodHindi(englishStem(task.request.prompt));
      if (!task.request.prompt.includes("दुकान की बिक्री") || !task.request.prompt.includes("| 2020 | 150 |")) throw new Error("The solver was not given the Hindi data");
      return { answer: "C", reasoning: "ok", ambiguous: false };
    });
    expect(done.status).toBe("completed");
    expect(stages[0]).toBe("translate");
    const hindiSet = (await db.query<{ status: string; title: string; chart: { title: string } }>("select status, title, chart from set_translations where set_id = $1", [set])).rows[0];
    expect(hindiSet).toMatchObject({ status: "needs_review", title: "दुकान की बिक्री" });
    expect(hindiSet.chart.title).toBe("वर्ष के अनुसार बिक्री");
  });

  it("rejects a data translation that changes a value", async () => {
    const { setTranslationProblem } = await import("@/lib/translation");
    const english = { title: "Shop sales", stimulus: "Sales of a shop.", chart: { type: "bar" as const, title: "Sales", categories: ["2019", "2020"], series: [{ name: "Sales", values: [120, 150] }] } };
    const hindi = { title: "दुकान की बिक्री", stimulus: "एक दुकान की बिक्री।", chart: { ...english.chart, title: "बिक्री", series: [{ name: "बिक्री", values: [120, 160] }] } };
    expect(setTranslationProblem(english, hindi)).toMatchObject({ error: expect.stringMatching(/every value/) });
  });

  it("does not translate English Language questions, or a question that already has a Hindi version", async () => {
    await addQuestion("English Language");
    await expect(start("English Language")).rejects.toThrow(/stay in English/);
    await expect(start("Translate Basic")).rejects.toThrow(/No questions to translate/);
  });

  it("shows a translation run on the monitor with translators and the meaning check", async () => {
    await addQuestion("Translate Monitor");
    const { id } = await start("Translate Monitor");
    const { batchSnapshot } = await import("@/lib/question-factory/monitor");
    const { advanceTranslation } = await import("@/lib/question-factory/translate");
    const { queueAi } = await import("@/lib/question-factory/engine");
    await advanceTranslation(db, queueAi(db), id, { budgetMs: 3000 });
    const snapshot = await batchSnapshot(db, id);
    expect(snapshot!.stages.map((stage) => stage.id)).toEqual(["translate", "verify"]);
    expect(snapshot!.batch.status).toBe("waiting_ai");
    expect(snapshot!.totals).toMatchObject({ written: 1, inFlight: 1 });
    expect(snapshot!.tasks.translate).toBe(1);
  });
});
