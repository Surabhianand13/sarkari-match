import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

let seriesId = "";
let userId = "";

async function db() {
  const { getDb } = await import("@/lib/db");
  return (await getDb())!;
}

describe("series structure", () => {
  beforeAll(async () => {
    const conn = await db();
    const { createUser } = await import("@/lib/auth/users");
    for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await conn.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
    userId = (await createUser({ email: "series-learner@example.com", passwordHash: "x" }))!.id;
    const exam = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
    seriesId = (await conn.query<{ id: string }>("insert into test_series (exam_id, slug, title, price_paise, status, published_at) values ($1,'mocks','Mocks',99900,'published', now()) returning id", [exam])).rows[0].id;
    for (const difficulty of ["easy", "moderate", "hard"]) {
      const values: unknown[] = [exam, difficulty];
      const tuples = Array.from({ length: 200 }, (_, i) => {
        values.push(`${difficulty} question number ${i}?`, `${difficulty}-${i}`);
        return `($1,'Quant',$2,$${3 + i * 2},'{"A":"1","B":"2","C":"3","D":"4"}','A','Because.','published',$${4 + i * 2},'t')`;
      });
      await conn.query(`insert into questions (exam_id, subject, difficulty, stem, options, correct_option, explanation, validation_status, content_hash, topic) values ${tuples.join(",")}`, values);
    }
    const { buildTests } = await import("@/lib/tests/builder");
    const base = { seriesId, titlePrefix: "", durationMinutes: 30, defaultMarks: 2, negativeMarks: 0.5, maxReuse: 5, status: "published" as const, seed: 5 };
    await buildTests({ ...base, kind: "full", level: "beginner", count: 40, sections: [{ name: "Quant", subject: "Quant", questions: 10 }] }, { dryRun: false });
    await buildTests({ ...base, kind: "full", level: "advanced", count: 3, sections: [{ name: "Quant", subject: "Quant", questions: 10 }] }, { dryRun: false });
    await buildTests({ ...base, kind: "sectional", level: "intermediate", count: 2, sections: [{ name: "Quant", subject: "Quant", questions: 10 }] }, { dryRun: false });
    await conn.query("update tests set is_free_sample = true where slug = 'beginner-mock-1'");
    await conn.query("insert into test_access (user_id, series_id, source) values ($1,$2,'purchase')", [userId, seriesId]);
  });

  it("groups tests by type and level in learning order", async () => {
    const { getSeriesGroups } = await import("@/lib/tests/catalog");
    const groups = await getSeriesGroups(seriesId);
    expect(groups.map((group) => [group.kind, group.level, group.count])).toEqual([["full", "beginner", 40], ["full", "advanced", 3], ["sectional", "intermediate", 2]]);
    expect(groups[0].freeSamples).toBe(1);
  });

  it("pages through a large group and filters by type and level", async () => {
    const { listSeriesTests, PAGE_SIZE } = await import("@/lib/tests/catalog");
    const first = await listSeriesTests(seriesId, { kind: "full", level: "beginner", page: 1 });
    const second = await listSeriesTests(seriesId, { kind: "full", level: "beginner", page: 2 });
    expect(first.total).toBe(40);
    expect(first.tests).toHaveLength(PAGE_SIZE);
    expect(second.tests).toHaveLength(10);
    expect(new Set([...first.tests, ...second.tests].map((test) => test.slug)).size).toBe(40);
    expect(first.tests[0]).toMatchObject({ kind: "full", level: "beginner", isFreeSample: true });
    expect((await listSeriesTests(seriesId, { kind: "sectional", level: "intermediate" })).total).toBe(2);
    expect((await listSeriesTests(seriesId, { limit: 4 })).tests).toHaveLength(4);
  });

  it("loads one test by slug without listing the series, and keeps only samples for the sitemap", async () => {
    const { getTest, getSampleTests } = await import("@/lib/tests/catalog");
    expect(await getTest(seriesId, "beginner-mock-7")).toMatchObject({ title: "Beginner Mock 7", questionCount: 10, level: "beginner" });
    expect(await getTest(seriesId, "nope")).toBeNull();
    expect((await getSampleTests(seriesId)).map((row) => row.slug)).toEqual(["beginner-mock-1"]);
  });

  it("suggests the next unattempted test: beginner first, then on to the next level", async () => {
    const { getNextTests } = await import("@/lib/tests/next");
    const conn = await db();
    expect((await getNextTests(userId))[0]).toMatchObject({ testSlug: "beginner-mock-1", level: "beginner" });
    const beginner = (await conn.query<{ id: string }>("select id from tests where level = 'beginner' and kind = 'full'")).rows;
    for (const test of beginner) await conn.query("insert into test_attempts (user_id, test_id, status, submitted_at) values ($1,$2,'submitted', now())", [userId, test.id]);
    expect((await getNextTests(userId))[0]).toMatchObject({ level: "intermediate", kind: "sectional" });
  });

  it("lists only exams that have a published series", async () => {
    const { getLiveExams } = await import("@/lib/tests/catalog");
    const conn = await db();
    await conn.query("insert into exams (slug, name) values ('upsc-cse','UPSC CSE')");
    expect(await getLiveExams()).toEqual([{ slug: "ssc-cgl", name: "SSC CGL" }]);
  });
});
