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

const options = '{"A":"1","B":"2","C":"3","D":"4"}';
const hindiOptions = JSON.stringify({ A: "1", B: "2", C: "3", D: "4" });
const chart = { type: "bar", title: "Sales", categories: ["2019", "2020"], series: [{ name: "Sales", values: [120, 150] }] };
const hindiChart = { ...chart, title: "बिक्री", series: [{ name: "बिक्री", values: [120, 150] }] };

beforeAll(async () => {
  const conn = await db();
  const { createUser } = await import("@/lib/auth/users");
  for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await conn.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
  userId = (await createUser({ email: "learner@example.com", passwordHash: "x" }))!.id;
  const examId = (await conn.query<{ id: string }>("insert into exams (slug, name) values ('ssc-cgl','SSC CGL') returning id")).rows[0].id;
  const seriesId = (await conn.query<{ id: string }>("insert into test_series (exam_id, slug, title, price_paise, status, published_at) values ($1,'mocks','Mocks',99900,'published', now()) returning id", [examId])).rows[0].id;
  testId = (await conn.query<{ id: string }>("insert into tests (series_id, slug, title, duration_minutes, status, is_free_sample, published_at) values ($1,'t1','Test 1',30,'published',true, now()) returning id", [seriesId])).rows[0].id;

  const makeSet = async (name: string, status: string) => {
    const set = (await conn.query<{ id: string }>("insert into question_sets (exam_id, subject, topic, difficulty, title, stimulus, chart, content_hash) values ($1,'Quantitative Aptitude','DI','moderate',$2,'Sales of a shop.',$3,$4) returning id", [examId, name, JSON.stringify(chart), `set-${name}`])).rows[0].id;
    await conn.query("insert into set_translations (set_id, lang, title, stimulus, chart, status) values ($1,'hi','दुकान की बिक्री','एक दुकान की बिक्री।',$2,$3)", [set, JSON.stringify(hindiChart), status]);
    return set;
  };
  const approvedSet = await makeSet("approved-set", "approved");
  const pendingSet = await makeSet("review-set", "needs_review");

  const add = async (stem: string, hash: string, position: number, translation: { status: string } | null, setId: string | null = null) => {
    const id = (await conn.query<{ id: string }>(
      `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash, set_id)
       values ($1,'Quantitative Aptitude','Percentage','moderate',$2,$3,'B','Answer in English.','published',$4,$5) returning id`, [examId, stem, options, hash, setId])).rows[0].id;
    await conn.query("insert into test_questions (test_id, question_id, position) values ($1,$2,$3)", [testId, id, position]);
    if (translation) {
      await conn.query("insert into question_translations (question_id, lang, stem, options, explanation, status) values ($1,'hi',$2,$3,'उत्तर: (B) 2',$4)", [id, `हिंदी प्रश्न: ${stem}`, hindiOptions, translation.status]);
    }
    return id;
  };
  await add("Plain approved question", "q-approved", 0, { status: "approved" });
  await add("Question still in review", "q-review", 1, { status: "needs_review" });
  await add("Question without Hindi", "q-none", 2, null);
  await add("Set question, data approved", "q-set-ok", 3, { status: "approved" }, approvedSet);
  await add("Set question, data in review", "q-set-wait", 4, { status: "approved" }, pendingSet);
});

describe("Hindi for learners", () => {
  it("sends the Hindi only when it is approved, and a set question only when its data is approved too", async () => {
    const { startAttempt, getPlayerData } = await import("@/lib/tests/attempts");
    const started = await startAttempt(userId, testId);
    if (!started.ok) throw new Error("no attempt");
    const player = await getPlayerData(userId, started.attemptId);
    const by = (text: string) => player!.questions.find((question) => question.stem.includes(text))!;
    expect(by("Plain approved").hi).toMatchObject({ stem: "हिंदी प्रश्न: Plain approved question", options: { B: "2" }, set: null });
    expect(by("still in review").hi).toBeNull();
    expect(by("without Hindi").hi).toBeNull();
    expect(by("data approved").hi?.set).toMatchObject({ title: "दुकान की बिक्री", chart: { title: "बिक्री" } });
    expect(by("data in review").hi).toBeNull();
    // The Hindi solution is not sent while the test is running.
    expect(JSON.stringify(player)).not.toContain("उत्तर");
    expect(JSON.stringify(player)).not.toContain("correct_option");
  });

  it("includes the Hindi solution on the results page", async () => {
    const { startAttempt, submitAttempt, getResultData } = await import("@/lib/tests/attempts");
    const conn = await db();
    await conn.query("update test_attempts set status = 'submitted' where user_id = $1 and status = 'in_progress'", [userId]);
    const started = await startAttempt(userId, testId);
    if (!started.ok) throw new Error("no attempt");
    expect(await submitAttempt(userId, started.attemptId)).toBe(true);
    const result = await getResultData(userId, started.attemptId);
    const plain = result!.solutions.find((solution) => solution.stem.includes("Plain approved"))!;
    expect(plain.hi?.explanation).toBe("उत्तर: (B) 2");
    expect(plain.explanation).toBe("Answer in English.");
    expect(result!.solutions.find((solution) => solution.stem.includes("without Hindi"))!.hi).toBeNull();
  });

  it("localizes a question, falling back to English when there is no Hindi version", async () => {
    const { localize, solutionFor } = await import("@/lib/localize");
    const question = { stem: "English", options: { A: "a" }, explanation: "English solution", hi: { stem: "हिंदी", options: { A: "क" }, explanation: "हिंदी हल", figure: null, set: null } };
    expect(localize(question, "hi")).toMatchObject({ stem: "हिंदी", options: { A: "क" }, translated: true });
    expect(localize(question, "en")).toMatchObject({ stem: "English", translated: false });
    expect(localize({ ...question, hi: null }, "hi")).toMatchObject({ stem: "English", translated: false });
    expect(solutionFor(question, "hi")).toBe("हिंदी हल");
    expect(solutionFor(question, "en")).toBe("English solution");
    expect(solutionFor({ explanation: "English solution", hi: null }, "hi")).toBe("English solution");
  });

  it("shows the Hindi in practice, with the solution only after answering", async () => {
    const { startSession, getSession, answerQuestion } = await import("@/lib/practice");
    const conn = await db();
    await conn.query("update questions set set_id = null where set_id is not null");
    const started = await startSession(userId, "Quantitative Aptitude", "Percentage");
    if (!started.ok) throw new Error("no session");
    const before = await getSession(userId, started.sessionId);
    const hindi = before!.questions.find((question) => question.hi);
    expect(hindi).toBeTruthy();
    expect(hindi!.hi!.explanation).toBeNull();
    expect(hindi!.hi!.stem).toMatch(/^हिंदी प्रश्न/);
    const answered = await answerQuestion(userId, started.sessionId, hindi!.id, "B");
    expect(answered.ok && answered.explanationHi).toBe("उत्तर: (B) 2");
    const after = await getSession(userId, started.sessionId);
    expect(after!.questions.find((question) => question.id === hindi!.id)!.hi!.explanation).toBe("उत्तर: (B) 2");
  });
});
