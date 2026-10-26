import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

let userId = "";
let otherId = "";
let seriesId = "";
let freeTestId = "";
let paidTestId = "";
let questionIds: string[] = [];

beforeAll(async () => {
  const { getDb } = await import("@/lib/db");
  const { createUser } = await import("@/lib/auth/users");
  const db = (await getDb())!;
  for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await db.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
  userId = (await createUser({ email: "student@example.com", passwordHash: "x" }))!.id;
  otherId = (await createUser({ email: "other@example.com", passwordHash: "x" }))!.id;

  const exam = (await db.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
  seriesId = (await db.query<{ id: string }>("insert into test_series (exam_id, slug, title, price_paise, status, published_at) values ($1,'tier-1','Tier I Series',99900,'published', now()) returning id", [exam])).rows[0].id;
  freeTestId = (await db.query<{ id: string }>("insert into tests (series_id, slug, title, duration_minutes, negative_marks, default_marks, is_free_sample, status, published_at) values ($1,'sample','Free Sample',30,0.5,2,true,'published', now()) returning id", [seriesId])).rows[0].id;
  paidTestId = (await db.query<{ id: string }>("insert into tests (series_id, slug, title, duration_minutes, status, published_at) values ($1,'mock-1','Mock 1',60,'published', now()) returning id", [seriesId])).rows[0].id;
  const section = (await db.query<{ id: string }>("insert into test_sections (test_id, name) values ($1,'Quantitative Aptitude') returning id", [freeTestId])).rows[0].id;
  for (let i = 0; i < 3; i++) {
    const q = await db.query<{ id: string }>(
      `insert into questions (subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash)
       values ('Quantitative Aptitude','Percentage','easy',$1,'{"A":"1","B":"2","C":"3","D":"4"}','B','Because two.','published',$2) returning id`,
      [`Question ${i} stem text`, `hash-${i}`]
    );
    questionIds.push(q.rows[0].id);
    await db.query("insert into test_questions (test_id, question_id, section_id, position) values ($1,$2,$3,$4)", [freeTestId, q.rows[0].id, section, i]);
  }
  await db.query("insert into test_questions (test_id, question_id, position) values ($1,$2,0)", [paidTestId, questionIds[0]]);
});

describe("access rules", () => {
  it("opens free samples to anyone signed in and locks paid tests until access is granted", async () => {
    const { startAttempt } = await import("@/lib/tests/attempts");
    expect((await startAttempt(userId, freeTestId)).ok).toBe(true);
    expect(await startAttempt(userId, paidTestId)).toEqual({ ok: false, reason: "locked" });
  });

  it("grants access once per payment reference and unlocks the paid test", async () => {
    const { getDb } = await import("@/lib/db");
    const { grantSeriesAccess, hasSeriesAccess } = await import("@/lib/tests/access");
    const { startAttempt } = await import("@/lib/tests/attempts");
    const db = (await getDb())!;
    expect(await hasSeriesAccess(userId, seriesId)).toBe(false);
    expect(await grantSeriesAccess(db, { userId, seriesId, source: "purchase", paymentRef: "pay_123456" })).toEqual({ granted: true });
    expect(await grantSeriesAccess(db, { userId, seriesId, source: "purchase", paymentRef: "pay_123456" })).toEqual({ granted: false });
    expect(await hasSeriesAccess(userId, seriesId)).toBe(true);
    expect(await hasSeriesAccess(otherId, seriesId)).toBe(false);
    expect((await startAttempt(userId, paidTestId)).ok).toBe(true);
  });

  it("expired access does not count", async () => {
    const { getDb } = await import("@/lib/db");
    const { grantSeriesAccess, hasSeriesAccess } = await import("@/lib/tests/access");
    const db = (await getDb())!;
    await grantSeriesAccess(db, { userId: otherId, seriesId, source: "grant", expiresAt: "2020-01-01T00:00:00Z" });
    expect(await hasSeriesAccess(otherId, seriesId)).toBe(false);
  });
});

describe("attempt lifecycle", () => {
  it("never sends answers to the player, autosaves, scores on submit and exposes solutions only afterwards", async () => {
    const { startAttempt, getPlayerData, saveAnswer, submitAttempt, getResultData } = await import("@/lib/tests/attempts");
    const started = await startAttempt(userId, freeTestId);
    if (!started.ok) throw new Error("expected start");
    const again = await startAttempt(userId, freeTestId);
    expect(again).toEqual(started);

    const player = await getPlayerData(userId, started.attemptId);
    expect(player?.questions).toHaveLength(3);
    expect(JSON.stringify(player)).not.toContain("correct_option");
    expect(JSON.stringify(player)).not.toContain("Because two");
    expect(await getPlayerData(otherId, started.attemptId)).toBeNull();
    expect(await getResultData(userId, started.attemptId)).toBeNull();

    expect(await saveAnswer(userId, started.attemptId, { questionId: questionIds[0], selected: "B", marked: false, timeSpentSeconds: 20 })).toBe("saved");
    expect(await saveAnswer(userId, started.attemptId, { questionId: questionIds[1], selected: "A", marked: true, timeSpentSeconds: 15 })).toBe("saved");
    expect(await saveAnswer(otherId, started.attemptId, { questionId: questionIds[0], selected: "A", marked: false, timeSpentSeconds: 1 })).toBe("not_found");
    expect(await saveAnswer(userId, started.attemptId, { questionId: "00000000-0000-4000-8000-000000000009", selected: "A", marked: false, timeSpentSeconds: 1 })).toBe("invalid");

    expect(await submitAttempt(userId, started.attemptId)).toBe(true);
    expect(await submitAttempt(userId, started.attemptId)).toBe(true);
    expect(await saveAnswer(userId, started.attemptId, { questionId: questionIds[2], selected: "B", marked: false, timeSpentSeconds: 1 })).toBe("expired");

    const result = await getResultData(userId, started.attemptId);
    expect(result?.result).toMatchObject({ correct: 1, incorrect: 1, unattempted: 1, score: 1.5, maxScore: 6 });
    expect(result?.solutions.find((s) => s.id === questionIds[0])).toMatchObject({ outcome: "correct", explanation: "Because two." });
    expect(result?.result.bySection[0].name).toBe("Quantitative Aptitude");
  });

  it("auto-submits an attempt whose deadline has passed", async () => {
    const { getDb } = await import("@/lib/db");
    const { startAttempt, getPlayerData, getResultData } = await import("@/lib/tests/attempts");
    const db = (await getDb())!;
    const started = await startAttempt(userId, freeTestId);
    if (!started.ok) throw new Error("expected start");
    await db.query("update test_attempts set deadline_at = now() - interval '1 minute' where id = $1", [started.attemptId]);
    const player = await getPlayerData(userId, started.attemptId);
    expect(player?.status).toBe("submitted");
    expect((await getResultData(userId, started.attemptId))?.result.unattempted).toBe(3);
  });
});

describe("checkout reference", () => {
  it("round-trips and rejects tampering", async () => {
    const { signCheckoutRef, verifyCheckoutRef } = await import("@/lib/tests/checkout-ref");
    const ref = await signCheckoutRef({ userId: "u1", product: "pass", targetId: "s1", amountPaise: 79900 });
    expect(await verifyCheckoutRef(ref)).toEqual({ userId: "u1", product: "pass", targetId: "s1", amountPaise: 79900 });
    expect(await verifyCheckoutRef(ref.slice(0, -3) + "abc")).toBeNull();
  });
});
