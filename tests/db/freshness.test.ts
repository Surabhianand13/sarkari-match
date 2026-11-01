import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

let seriesId = "";

async function db() {
  const { getDb } = await import("@/lib/db");
  return (await getDb())!;
}

beforeAll(async () => {
  const conn = await db();
  for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await conn.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
  const examId = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
  seriesId = (await conn.query<{ id: string }>("insert into test_series (exam_id, slug, title, price_paise, status, published_at) values ($1,'mocks','Mocks',99900,'published', now()) returning id", [examId])).rows[0].id;
  const add = (topic: string, n: number, validUntil: string) =>
    conn.query(
      `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash, valid_until)
       values ($1,'General Awareness',$2,'moderate',$3,'{"A":"a","B":"b","C":"c","D":"d"}','B','From the note.','published',$4,$5::date)`,
      [examId, topic, `${topic} question ${n}`, `${topic}-${n}`, validUntil === "none" ? null : validUntil === "past" ? new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) : new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)]
    );
  for (let i = 0; i < 3; i++) await add("Current Affairs", i, "past");
  for (let i = 3; i < 6; i++) await add("Current Affairs", i, "future");
  await add("Current Affairs", 6, "none");
  for (let i = 0; i < 3; i++) await add("Old Awards", i, "past");
});

const input = (questions: number) => ({
  seriesId, kind: "topic" as const, level: "intermediate" as const, count: 1, titlePrefix: "", durationMinutes: 20, defaultMarks: 2, negativeMarks: 0.5, maxReuse: 1, status: "draft" as const, seed: 3,
  sections: [{ name: "Current Affairs", subject: "General Awareness", questions, topic: "Current Affairs" }]
});

describe("expired facts", () => {
  it("keeps expired questions out of new tests, and counts only the ones that can still be used", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    // Seven are published, three of them expired: four can be used.
    const fits = await buildTests(input(4), { dryRun: true });
    expect(fits.shortages).toEqual([]);
    expect(fits.planned).toBe(1);
    const tooMany = await buildTests(input(5), { dryRun: true });
    expect(tooMany.planned).toBe(0);
    expect(tooMany.shortages.length).toBeGreaterThan(0);
  });

  it("builds a real test from the usable ones only", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    const conn = await db();
    const report = await buildTests(input(4), { dryRun: false });
    expect(report.created).toBe(1);
    const used = await conn.query<{ valid_until: string | null }>("select q.valid_until::text from test_questions tq join questions q on q.id = tq.question_id");
    expect(used.rows).toHaveLength(4);
    expect(used.rows.every((row) => row.valid_until === null || row.valid_until >= new Date().toISOString().slice(0, 10))).toBe(true);
  });

  it("leaves expired questions out of practice, and out of the topic list when nothing usable is left", async () => {
    const { getSubjects } = await import("@/lib/practice");
    const awareness = (await getSubjects()).find((subject) => subject.subject === "General Awareness")!;
    expect(awareness.topics).toContain("Current Affairs");
    expect(awareness.topics).not.toContain("Old Awards");
    expect(awareness.questions).toBe(4);
  });
});
