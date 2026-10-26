import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

let userId = "";

async function playSession(subject: string, correctCount: number) {
  const { getDb } = await import("@/lib/db");
  const { startSession, getSession, answerQuestion } = await import("@/lib/practice");
  const db = (await getDb())!;
  const started = await startSession(userId, subject, null);
  if (!started.ok) throw new Error("no questions");
  const session = (await getSession(userId, started.sessionId))!;
  expect(session.questions.every((question) => question.correctOption === null && question.explanation === null)).toBe(true);
  let finished = null;
  for (const [index, question] of session.questions.entries()) {
    const right = (await db.query<{ correct_option: string }>("select correct_option from questions where id = $1", [question.id])).rows[0].correct_option;
    const wrong = right === "A" ? "B" : "A";
    const result = await answerQuestion(userId, started.sessionId, question.id, index < correctCount ? right : wrong);
    if (!result.ok) throw new Error(result.reason);
    finished = result.finished;
  }
  return finished!;
}

describe("adaptive practice", () => {
  beforeAll(async () => {
    const { getDb } = await import("@/lib/db");
    const { createUser } = await import("@/lib/auth/users");
    const db = (await getDb())!;
    for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await db.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
    userId = (await createUser({ email: "learner@example.com", passwordHash: "x" }))!.id;
    const exam = (await db.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
    for (const difficulty of ["easy", "moderate", "hard"]) {
      for (let i = 0; i < 12; i++) {
        await db.query(
          `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash)
           values ($1,'Quantitative Aptitude','Percentage',$2,$3,$4,'C','Because.','published',$5)`,
          [exam, difficulty, `${difficulty} question number ${i} about percentages?`, JSON.stringify({ A: "1", B: "2", C: "3", D: "4" }), `${difficulty}-${i}`]
        );
      }
    }
  });

  it("promotes after three sessions of 70% or more in a row, and resets the streak on a weak session", async () => {
    expect((await playSession("Quantitative Aptitude", 8)).goodSessions).toBe(1);
    expect((await playSession("Quantitative Aptitude", 5)).goodSessions).toBe(0);
    await playSession("Quantitative Aptitude", 7);
    await playSession("Quantitative Aptitude", 9);
    const promoted = await playSession("Quantitative Aptitude", 10);
    expect(promoted.promoted).toBe(true);
    expect(promoted.levelBefore).toBe("beginner");
    expect(promoted.levelAfter).toBe("intermediate");
    expect(promoted.goodSessions).toBe(0);
  }, 60000);

  it("serves questions of the new level and reuses an unfinished session", async () => {
    const { getDb } = await import("@/lib/db");
    const { startSession, getSession } = await import("@/lib/practice");
    const db = (await getDb())!;
    const first = await startSession(userId, "Quantitative Aptitude", null);
    if (!first.ok) throw new Error("no session");
    const session = (await getSession(userId, first.sessionId))!;
    expect(session.level).toBe("intermediate");
    const difficulties = await db.query<{ difficulty: string }>("select distinct difficulty from questions where id = any($1::uuid[])", [session.questions.map((question) => question.id)]);
    expect(difficulties.rows.map((row) => row.difficulty)).toEqual(["moderate"]);
    const again = await startSession(userId, "Quantitative Aptitude", null);
    expect(again.ok && again.sessionId).toBe(first.sessionId);
  });

  it("does not let another learner read or answer the session", async () => {
    const { createUser } = await import("@/lib/auth/users");
    const { getSession, startSession, answerQuestion } = await import("@/lib/practice");
    const other = (await createUser({ email: "other-learner@example.com", passwordHash: "x" }))!.id;
    const mine = await startSession(userId, "Quantitative Aptitude", null);
    if (!mine.ok) throw new Error("no session");
    expect(await getSession(other, mine.sessionId)).toBeNull();
    const result = await answerQuestion(other, mine.sessionId, "00000000-0000-4000-8000-000000000000", "A");
    expect(result.ok).toBe(false);
  });
});
