import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

let userId = "";
let testId = "";

async function db() {
  const { getDb } = await import("@/lib/db");
  return (await getDb())!;
}

beforeAll(async () => {
  const conn = await db();
  const { createUser } = await import("@/lib/auth/users");
  for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await conn.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
  userId = (await createUser({ email: "learner@example.com", passwordHash: "x" }))!.id;
  const examId = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
  const seriesId = (await conn.query<{ id: string }>("insert into test_series (exam_id, slug, title, price_paise, status, published_at) values ($1,'mocks','Mocks',99900,'published', now()) returning id", [examId])).rows[0].id;
  testId = (await conn.query<{ id: string }>("insert into tests (series_id, slug, title, duration_minutes, status, is_free_sample, published_at) values ($1,'t1','Test 1',30,'published',true, now()) returning id", [seriesId])).rows[0].id;
  const add = async (stem: string, month: string | null, position: number) => {
    const id = (await conn.query<{ id: string }>(
      `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash, fact_as_of)
       values ($1,'General Awareness','Current Affairs','moderate',$2,'{"A":"a","B":"b","C":"c","D":"d"}','B','From the note.','published',$3,$4::date) returning id`, [examId, stem, `fresh-${position}`, month])).rows[0].id;
    await conn.query("insert into test_questions (test_id, question_id, position) values ($1,$2,$3)", [testId, id, position]);
  };
  await add("A question from a recent month", "2026-10-01", 0);
  await add("A question from a long time ago", "2023-03-01", 1);
  await add("A question with no month", null, 2);
});

describe("current-affairs months reach learners, and old questions are not removed", () => {
  it("sends each question's month to the player and the solutions", async () => {
    const { startAttempt, getPlayerData, submitAttempt, getResultData } = await import("@/lib/tests/attempts");
    const started = await startAttempt(userId, testId);
    if (!started.ok) throw new Error("no attempt");
    const player = await getPlayerData(userId, started.attemptId);
    const by = (text: string) => player!.questions.find((question) => question.stem.includes(text))!;
    expect(by("recent month").factMonth).toBe("2026-10-01");
    expect(by("long time ago").factMonth).toBe("2023-03-01");
    expect(by("no month").factMonth).toBeNull();
    expect(await submitAttempt(userId, started.attemptId)).toBe(true);
    const result = await getResultData(userId, started.attemptId);
    expect(result!.solutions.find((solution) => solution.stem.includes("recent month"))!.factMonth).toBe("2026-10-01");
  });

  it("keeps an old question in the test builder and in practice", async () => {
    const { buildTests } = await import("@/lib/tests/builder");
    const conn = await db();
    const seriesId = (await conn.query<{ id: string }>("select id from test_series limit 1")).rows[0].id;
    const report = await buildTests({ seriesId, kind: "topic", level: "intermediate", count: 1, titlePrefix: "", durationMinutes: 20, defaultMarks: 2, negativeMarks: 0.5, maxReuse: 5, status: "draft", seed: 3, sections: [{ name: "Current Affairs", subject: "General Awareness", questions: 3, topic: "Current Affairs" }] }, { dryRun: true });
    expect(report.shortages).toEqual([]);
    expect(report.planned).toBe(1);

    const { startSession, getSession } = await import("@/lib/practice");
    const started = await startSession(userId, "General Awareness", "Current Affairs");
    if (!started.ok) throw new Error("no session");
    const session = await getSession(userId, started.sessionId);
    expect(session!.questions).toHaveLength(3);
    expect(session!.questions.map((question) => question.factMonth).sort()).toEqual(["2023-03-01", "2026-10-01", null].sort());
  });
});
