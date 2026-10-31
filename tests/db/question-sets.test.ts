import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

let examId = "";
let seriesId = "";
let userId = "";
const setIds: string[] = [];

async function db() {
  const { getDb } = await import("@/lib/db");
  return (await getDb())!;
}

const chart = (n: number) => ({ type: "bar", title: `Sales ${n}`, unit: "₹ lakh", categories: ["2019", "2020", "2021"], series: [{ name: "Sales", values: [100 + n, 120 + n, 150 + n] }] });

beforeAll(async () => {
  const conn = await db();
  const { createUser } = await import("@/lib/auth/users");
  for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await conn.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
  userId = (await createUser({ email: "learner@example.com", passwordHash: "x" }))!.id;
  examId = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
  seriesId = (await conn.query<{ id: string }>("insert into test_series (exam_id, slug, title, price_paise, status, published_at) values ($1,'mocks','Mocks',99900,'published', now()) returning id", [examId])).rows[0].id;

  // Twenty-four ordinary Quantitative questions (two tests of ten need twenty).
  for (let i = 0; i < 24; i++) {
    await conn.query(
      `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash)
       values ($1,'Quantitative Aptitude','Percentage','moderate',$2,'{"A":"1","B":"2","C":"3","D":"4"}','B','Because two.','published',$3)`,
      [examId, `Ordinary question number ${i}?`, `plain-${i}`]
    );
  }
  // Four data sets of five published questions each.
  for (let s = 0; s < 4; s++) {
    const set = await conn.query<{ id: string }>(
      "insert into question_sets (exam_id, subject, topic, difficulty, title, stimulus, chart, content_hash) values ($1,'Quantitative Aptitude','Data Interpretation','moderate',$2,'The shop sales.',$3,$4) returning id",
      [examId, `Shop ${s}`, JSON.stringify(chart(s)), `set-${s}`]
    );
    setIds.push(set.rows[0].id);
    for (let q = 0; q < 5; q++) {
      await conn.query(
        `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash, set_id, set_position)
         values ($1,'Quantitative Aptitude','Data Interpretation','moderate',$2,'{"A":"1","B":"2","C":"3","D":"4"}','B','Read the chart.','published',$3,$4,$5)`,
        [examId, `Set ${s} question ${q}: what does the chart show?`, `set-${s}-q-${q}`, set.rows[0].id, q]
      );
    }
  }
});

const input = (overrides: Record<string, unknown> = {}) => ({
  seriesId, kind: "full" as const, level: "intermediate" as const, count: 2, titlePrefix: "", durationMinutes: 60, defaultMarks: 2, negativeMarks: 0.5, maxReuse: 1, status: "draft" as const, seed: 5,
  sections: [
    { name: "Quant", subject: "Quantitative Aptitude", questions: 10 },
    { name: "Data Interpretation", subject: "Quantitative Aptitude", questions: 10, topic: "Data Interpretation", sets: true }
  ],
  ...overrides
});

describe("building tests with data sets", () => {
  it("keeps every set whole and in order, and keeps set questions out of ordinary sections", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    const conn = await db();
    const report = await buildTests(input(), { dryRun: false });
    expect(report.shortages).toEqual([]);
    expect(report.created).toBe(2);

    const tests = await conn.query<{ id: string }>("select id from tests where series_id = $1 order by position", [seriesId]);
    for (const test of tests.rows) {
      const rows = await conn.query<{ section: string; set_id: string | null; set_position: number | null }>(
        `select ts.name as section, q.set_id, q.set_position from test_questions tq join questions q on q.id = tq.question_id join test_sections ts on ts.id = tq.section_id
          where tq.test_id = $1 order by ts.position, tq.position`, [test.id]);
      const quant = rows.rows.filter((row) => row.section === "Quant");
      const di = rows.rows.filter((row) => row.section === "Data Interpretation");
      expect(quant).toHaveLength(10);
      expect(quant.every((row) => row.set_id === null)).toBe(true);
      expect(di).toHaveLength(10);
      // Two whole sets, each five questions in order, side by side.
      expect(new Set(di.map((row) => row.set_id)).size).toBe(2);
      for (const block of [di.slice(0, 5), di.slice(5)]) {
        expect(new Set(block.map((row) => row.set_id)).size).toBe(1);
        expect(block.map((row) => row.set_position)).toEqual([0, 1, 2, 3, 4]);
      }
    }
    // Two tests used four different sets: none was repeated.
    const used = await conn.query<{ n: string }>("select count(distinct q.set_id) as n from test_questions tq join questions q on q.id = tq.question_id where q.set_id is not null");
    expect(Number(used.rows[0].n)).toBe(4);
  });

  it("says plainly when whole sets cannot fill the section", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    // Seven questions cannot be made from sets of five.
    const odd = await buildTests(input({ sections: [{ name: "Data Interpretation", subject: "Quantitative Aptitude", questions: 7, topic: "Data Interpretation", sets: true }] }), { dryRun: true });
    expect(odd.shortages.join(" ")).toMatch(/whole data sets/);
    // All four sets are already used once and may not be reused.
    const spent = await buildTests(input({ count: 1, sections: [{ name: "Data Interpretation", subject: "Quantitative Aptitude", questions: 10, topic: "Data Interpretation", sets: true }] }), { dryRun: true });
    expect(spent.planned).toBe(0);
    expect(spent.shortages.length).toBeGreaterThan(0);
    // With reuse allowed the same data may appear again.
    const again = await buildTests(input({ count: 1, maxReuse: 2, sections: [{ name: "Data Interpretation", subject: "Quantitative Aptitude", questions: 10, topic: "Data Interpretation", sets: true }] }), { dryRun: true });
    expect(again.planned).toBe(1);
  });
});

describe("learner view of a data set", () => {
  it("sends the set's data with each question, and shows it again with the solutions", async () => {
    const conn = await db();
    const { startAttempt, getPlayerData, submitAttempt, getResultData } = await import("@/lib/tests/attempts");
    const test = (await conn.query<{ id: string }>("select id from tests where series_id = $1 order by position limit 1", [seriesId])).rows[0];
    await conn.query("update tests set status = 'published', is_free_sample = true, published_at = now() where id = $1", [test.id]);

    const started = await startAttempt(userId, test.id);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const player = await getPlayerData(userId, started.attemptId);
    const withSet = player!.questions.filter((question) => question.set);
    expect(withSet).toHaveLength(10);
    expect(withSet[0].set!.chart!.type).toBe("bar");
    expect(withSet[0].set!.stimulus).toBe("The shop sales.");
    expect(player!.questions.filter((question) => !question.set)).toHaveLength(10);
    // The data is not an answer, but the key still never reaches the player.
    expect(JSON.stringify(player)).not.toContain("correct_option");

    expect(await submitAttempt(userId, started.attemptId)).toBe(true);
    const result = await getResultData(userId, started.attemptId);
    const solutions = result!.solutions.filter((solution) => solution.set);
    expect(solutions).toHaveLength(10);
    expect(solutions[0].set!.title).toMatch(/^Shop /);
  });

  it("keeps data-set questions out of practice sessions, which have no place to show the data", async () => {
    const { getSubjects } = await import("@/lib/practice");
    const subjects = await getSubjects();
    const quant = subjects.find((subject) => subject.subject === "Quantitative Aptitude")!;
    expect(quant.topics).toContain("Percentage");
    expect(quant.topics).not.toContain("Data Interpretation");
  });
});
