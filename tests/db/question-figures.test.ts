import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

let userId = "";
let testId = "";
let imageId = "";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6]);
const venn = { type: "venn", title: "Club", sets: ["Cricket", "Football"], counts: { "1": 12, "2": 8, "12": 5, none: 4 } };

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
  imageId = (await conn.query<{ id: string }>("insert into question_images (data, content_type, alt) values ($1,'image/png','A triangle with a line parallel to its base') returning id", [png])).rows[0].id;

  const options = '{"A":"1","B":"2","C":"3","D":"4"}';
  const add = async (stem: string, hash: string, figure: unknown, image: string | null, position: number) => {
    const id = (await conn.query<{ id: string }>(
      `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, validation_status, content_hash, figure, image_id)
       values ($1,'Reasoning','Venn Diagrams','moderate',$2,$3,'B','Because two.','published',$4,$5,$6) returning id`,
      [examId, stem, options, hash, figure ? JSON.stringify(figure) : null, image]
    )).rows[0].id;
    await conn.query("insert into test_questions (test_id, question_id, position) values ($1,$2,$3)", [testId, id, position]);
  };
  await add("In the Venn diagram, how many play only cricket?", "fig-q", venn, null, 0);
  await add("Look at the picture. Which line is parallel to the base?", "img-q", null, imageId, 1);
  await add("A plain question with no figure at all?", "plain-q", null, null, 2);
});

describe("figures and pictures reach the learner", () => {
  it("sends each question's figure or picture to the player, and again with the solutions", async () => {
    const { startAttempt, getPlayerData, submitAttempt, getResultData } = await import("@/lib/tests/attempts");
    const started = await startAttempt(userId, testId);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const player = await getPlayerData(userId, started.attemptId);
    const byStem = (text: string) => player!.questions.find((question) => question.stem.includes(text))!;
    expect(byStem("Venn diagram").figure).toMatchObject({ type: "venn", sets: ["Cricket", "Football"] });
    expect(byStem("Venn diagram").image).toBeNull();
    expect(byStem("picture")).toMatchObject({ figure: null, image: { id: imageId, alt: "A triangle with a line parallel to its base" } });
    expect(byStem("plain")).toMatchObject({ figure: null, image: null });
    expect(JSON.stringify(player)).not.toContain("correct_option");

    expect(await submitAttempt(userId, started.attemptId)).toBe(true);
    const result = await getResultData(userId, started.attemptId);
    expect(result!.solutions.filter((solution) => solution.figure)).toHaveLength(1);
    expect(result!.solutions.filter((solution) => solution.image)).toHaveLength(1);
  });

  it("ignores a stored figure that is no longer valid instead of breaking the page", async () => {
    const conn = await db();
    await conn.query("update questions set figure = '{\"type\":\"venn\",\"sets\":[\"Only one\"],\"counts\":{}}' where content_hash = 'fig-q'");
    const { startAttempt, getPlayerData } = await import("@/lib/tests/attempts");
    const next = await startAttempt(userId, testId);
    if (!next.ok) throw new Error("no attempt");
    const player = await getPlayerData(userId, next.attemptId);
    expect(player!.questions.every((question) => question.figure === null)).toBe(true);
    await conn.query("update questions set figure = $1 where content_hash = 'fig-q'", [JSON.stringify(venn)]);
  });

  it("serves the uploaded picture with its type and a long cache, and 404s for anything else", async () => {
    const { GET } = await import("@/app/api/question-images/[id]/route");
    const found = await GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: imageId }) });
    expect(found.status).toBe(200);
    expect(found.headers.get("Content-Type")).toBe("image/png");
    expect(found.headers.get("Cache-Control")).toContain("immutable");
    expect(found.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await found.arrayBuffer())).toEqual(png);
    expect((await GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) })).status).toBe(404);
    expect((await GET(new Request("http://localhost/x"), { params: Promise.resolve({ id: "not-an-id" }) })).status).toBe(404);
  });

  it("shows the figure and picture in practice too", async () => {
    const { startSession, getSession } = await import("@/lib/practice");
    const started = await startSession(userId, "Reasoning", "Venn Diagrams");
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const session = await getSession(userId, started.sessionId);
    expect(session!.questions.some((question) => question.figure?.type === "venn")).toBe(true);
    expect(session!.questions.some((question) => question.image?.id === imageId)).toBe(true);
  });
});

describe("re-checking leaves a person's pictures alone", () => {
  it("does not send a question with an uploaded picture back through the AI checks", async () => {
    const conn = await db();
    const examId = (await conn.query<{ id: string }>("select id from exams where slug = 'ssc-cgl'")).rows[0].id;
    const options = '{"A":"1","B":"2","C":"3","D":"4"}';
    const add = (stem: string, hash: string, image: string | null) =>
      conn.query(
        `insert into questions (exam_id, subject, topic, difficulty, stem, options, correct_option, explanation, source_type, validation_status, pipeline_stage, content_hash, image_id)
         values ($1,'Reasoning','Venn Diagrams','moderate',$2,$3,'B','Because two.','imported','needs_review','done',$4,$5)`,
        [examId, stem, options, hash, image]
      );
    await add("An imported question without a picture, to be re-checked?", "recheck-plain", null);
    await add("An imported question with a picture, left to a person?", "recheck-image", imageId);
    const { recheckQuestions } = await import("@/lib/question-factory/engine");
    const { count } = await recheckQuestions(conn, { exam: "SSC CGL", tier: "Tier I", subject: "Reasoning", mode: "queue", limit: 10, includeApproved: false });
    expect(count).toBe(1);
    const moved = await conn.query<{ content_hash: string }>("select content_hash from questions where pipeline_stage = 'solve' and content_hash like 'recheck-%'");
    expect(moved.rows.map((row) => row.content_hash)).toEqual(["recheck-plain"]);
  });
});
