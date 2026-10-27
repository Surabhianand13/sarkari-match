import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

let seriesId = "";
let examId = "";

async function db() {
  const { getDb } = await import("@/lib/db");
  return (await getDb())!;
}

describe("test builder", () => {
  beforeAll(async () => {
    const conn = await db();
    for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await conn.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
    examId = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
    seriesId = (await conn.query<{ id: string }>("insert into test_series (exam_id, slug, title, price_paise, status) values ($1,'mocks','Mocks',99900,'draft') returning id", [examId])).rows[0].id;
    // 2 subjects x 3 difficulties x 40 questions each = 240 published questions.
    for (const subject of ["Quantitative Aptitude", "English"]) {
      for (const difficulty of ["easy", "moderate", "hard"]) {
        const values: unknown[] = [examId, subject, difficulty];
        const tuples = Array.from({ length: 40 }, (_, i) => {
          values.push(`${subject} ${difficulty} question number ${i}?`, `${subject}-${difficulty}-${i}`, `topic ${i % 4}`);
          return `($1,$2,$3,$${4 + i * 3},'{"A":"1","B":"2","C":"3","D":"4"}','A','Because.','published',$${5 + i * 3},$${6 + i * 3})`;
        });
        await conn.query(`insert into questions (exam_id, subject, difficulty, stem, options, correct_option, explanation, validation_status, content_hash, topic) values ${tuples.join(",")}`, values);
      }
    }
  });

  const input = (overrides: Record<string, unknown> = {}) => ({
    seriesId, kind: "full" as const, level: "beginner" as const, count: 3, titlePrefix: "", durationMinutes: 60, defaultMarks: 2, negativeMarks: 0.5, maxReuse: 1, status: "draft" as const, seed: 3,
    sections: [{ name: "Quantitative Aptitude", subject: "Quantitative Aptitude", questions: 20 }, { name: "English", subject: "English", questions: 20 }],
    ...overrides
  });

  it("previews without writing anything", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    const report = await buildTests(input(), { dryRun: true });
    expect(report).toMatchObject({ created: 0, planned: 3, wanted: 3, shortages: [] });
    expect(report.titles[0]).toBe("Beginner Mock 1");
    expect((await (await db()).query("select 1 from tests")).rows).toHaveLength(0);
  });

  it("creates draft tests with sections, ordered questions, kind and level, never repeating a question", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    const conn = await db();
    const report = await buildTests(input(), { dryRun: false });
    expect(report.created).toBe(3);
    const tests = await conn.query<{ id: string; slug: string; status: string; kind: string; level: string; position: number }>("select id, slug, status, kind, level, position from tests where series_id = $1 order by position", [seriesId]);
    expect(tests.rows.map((row) => row.slug)).toEqual(["beginner-mock-1", "beginner-mock-2", "beginner-mock-3"]);
    expect(tests.rows.every((row) => row.status === "draft" && row.kind === "full" && row.level === "beginner")).toBe(true);
    const counts = await conn.query<{ test_id: string; n: string; distinct_n: string; sections: string }>(
      "select test_id, count(*) as n, count(distinct question_id) as distinct_n, count(distinct section_id) as sections from test_questions group by test_id");
    for (const row of counts.rows) expect([Number(row.n), Number(row.distinct_n), Number(row.sections)]).toEqual([40, 40, 2]);
    const reuse = await conn.query<{ max: string }>("select max(c) as max from (select count(*) as c from test_questions group by question_id) x");
    expect(Number(reuse.rows[0].max)).toBe(1);
  });

  it("continues the numbering and avoids reusing questions already placed in tests", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    const conn = await db();
    const report = await buildTests(input({ count: 2 }), { dryRun: false });
    expect(report.created).toBe(2);
    const slugs = (await conn.query<{ slug: string }>("select slug from tests where level = 'beginner' and kind = 'full' order by position")).rows.map((row) => row.slug);
    expect(slugs.slice(-2)).toEqual(["beginner-mock-4", "beginner-mock-5"]);
    const reuse = await conn.query<{ max: string }>("select max(c) as max from (select count(*) as c from test_questions group by question_id) x");
    expect(Number(reuse.rows[0].max)).toBe(1); // 5 tests x 20 per subject = 100 of 120 per subject, still all unique
  });

  it("creates nothing when the bank cannot supply the request", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    const conn = await db();
    const before = Number((await conn.query<{ n: string }>("select count(*) as n from tests")).rows[0].n);
    const report = await buildTests(input({ count: 10 }), { dryRun: false });
    expect(report.created).toBe(0);
    expect(report.shortages.length).toBeGreaterThan(0);
    expect(Number((await conn.query<{ n: string }>("select count(*) as n from tests")).rows[0].n)).toBe(before);
  });

  it("builds subject and topic tests and publishes drafts in bulk", async () => {
    const { buildTests, publishDrafts } = await import("@/lib/tests/builder");
    const conn = await db();
    const subject = await buildTests(input({ kind: "sectional", level: "intermediate", count: 2, maxReuse: 2, durationMinutes: 20, sections: [{ name: "English", subject: "English", questions: 25 }] }), { dryRun: false });
    expect(subject.created).toBe(2);
    const row = (await conn.query<{ slug: string; kind: string; subject: string; level: string }>("select slug, kind, subject, level from tests where kind = 'sectional' order by position limit 1")).rows[0];
    expect(row).toMatchObject({ slug: "intermediate-english-test-1", kind: "sectional", subject: "English", level: "intermediate" });
    const topic = await buildTests(input({ kind: "topic", level: "beginner", count: 1, maxReuse: 2, durationMinutes: 10, sections: [{ name: "Quant topic", subject: "Quantitative Aptitude", topic: "topic 1", questions: 8 }] }), { dryRun: false });
    expect(topic.created).toBe(1);
    expect((await conn.query<{ topic: string }>("select topic from tests where kind = 'topic'")).rows[0].topic).toBe("topic 1");

    expect(await publishDrafts({ seriesId, kind: "sectional", level: "intermediate" })).toBe(2);
    expect(Number((await conn.query<{ n: string }>("select count(*) as n from tests where status = 'published'")).rows[0].n)).toBe(2);
    expect(await publishDrafts({ seriesId })).toBeGreaterThan(0);
  });
});
