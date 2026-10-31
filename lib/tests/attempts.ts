import { getDb, type Db } from "@/lib/db";
import { canOpenTest } from "@/lib/tests/access";
import { toQuestionSet, type QuestionSet } from "@/lib/question-sets";
import { scoreAttempt, type ScorableQuestion, type ScoreResult } from "@/lib/tests/scoring";

const GRACE_SECONDS = 5;

export type StartResult = { ok: true; attemptId: string } | { ok: false; reason: "not_found" | "locked" | "no_questions" | "unavailable" };

type TestRow = { id: string; series_id: string; duration_minutes: number; is_free_sample: boolean; status: string; negative_marks: string; default_marks: string };

async function loadQuestions(db: Db, testId: string, defaultMarks: number) {
  const { rows } = await db.query<{ id: string; stem: string; options: Record<string, string>; correct_option: string; explanation: string; subject: string; topic: string; marks: string | null; section: string | null; position: number; section_position: number | null; set_id: string | null; set_title: string | null; set_stimulus: string | null; set_chart: unknown }>(
    `select q.id, q.stem, q.options, q.correct_option, q.explanation, q.subject, q.topic, tq.marks, ts.name as section, tq.position, ts.position as section_position,
            q.set_id, qs.title as set_title, qs.stimulus as set_stimulus, qs.chart as set_chart
     from test_questions tq join questions q on q.id = tq.question_id left join test_sections ts on ts.id = tq.section_id left join question_sets qs on qs.id = q.set_id
     where tq.test_id = $1 order by coalesce(ts.position, 0), tq.position`,
    [testId]
  );
  return rows.map((row) => ({
    ...row,
    section: row.section ?? "All questions",
    marksValue: row.marks === null ? defaultMarks : Number(row.marks),
    set: row.set_id ? toQuestionSet({ id: row.set_id, title: row.set_title ?? "", stimulus: row.set_stimulus ?? "", chart: row.set_chart }) : null
  }));
}

export async function startAttempt(userId: string, testId: string): Promise<StartResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "unavailable" };
  const test = (await db.query<TestRow>("select id, series_id, duration_minutes, is_free_sample, status, negative_marks, default_marks from tests where id = $1", [testId])).rows[0];
  if (!test || test.status !== "published") return { ok: false, reason: "not_found" };
  if (!(await canOpenTest(userId, { seriesId: test.series_id, isFreeSample: test.is_free_sample }))) return { ok: false, reason: "locked" };

  const active = (await db.query<{ id: string; deadline_at: string }>("select id, deadline_at::text from test_attempts where user_id = $1 and test_id = $2 and status = 'in_progress'", [userId, testId])).rows[0];
  if (active) {
    if (new Date(active.deadline_at).getTime() + GRACE_SECONDS * 1000 > Date.now()) return { ok: true, attemptId: active.id };
    await finalizeAttempt(db, active.id);
  }

  const count = await db.query<{ n: string }>("select count(*) as n from test_questions where test_id = $1", [testId]);
  if (Number(count.rows[0].n) === 0) return { ok: false, reason: "no_questions" };
  const created = await db.query<{ id: string }>(
    "insert into test_attempts (user_id, test_id, deadline_at) values ($1, $2, now() + ($3 || ' minutes')::interval) returning id",
    [userId, testId, String(test.duration_minutes)]
  );
  return { ok: true, attemptId: created.rows[0].id };
}

export type PlayerQuestion = { id: string; stem: string; options: Record<string, string>; section: string; marks: number; set: QuestionSet | null };

export type PlayerData = {
  attemptId: string;
  status: "in_progress" | "submitted";
  testTitle: string;
  seriesTitle: string;
  negativeMarks: number;
  deadlineAt: string;
  serverNow: string;
  questions: PlayerQuestion[];
  answers: Record<string, { selected: string | null; marked: boolean }>;
};

// Correct answers and explanations are deliberately not part of this payload.
export async function getPlayerData(userId: string, attemptId: string): Promise<PlayerData | null> {
  const db = await getDb();
  if (!db) return null;
  const attempt = (await db.query<{ id: string; test_id: string; status: "in_progress" | "submitted"; deadline_at: string }>("select id, test_id, status, deadline_at::text from test_attempts where id = $1 and user_id = $2", [attemptId, userId])).rows[0];
  if (!attempt) return null;
  if (attempt.status === "in_progress" && new Date(attempt.deadline_at).getTime() + GRACE_SECONDS * 1000 < Date.now()) {
    await finalizeAttempt(db, attemptId);
    return { attemptId, status: "submitted", testTitle: "", seriesTitle: "", negativeMarks: 0, deadlineAt: attempt.deadline_at, serverNow: new Date().toISOString(), questions: [], answers: {} };
  }
  const meta = (await db.query<{ title: string; series_title: string; negative_marks: string; default_marks: string }>(
    "select t.title, s.title as series_title, t.negative_marks, t.default_marks from tests t join test_series s on s.id = t.series_id where t.id = $1", [attempt.test_id])).rows[0];
  const questions = await loadQuestions(db, attempt.test_id, Number(meta.default_marks));
  const saved = await db.query<{ question_id: string; selected_option: string | null; marked_for_review: boolean }>("select question_id, selected_option, marked_for_review from attempt_answers where attempt_id = $1", [attemptId]);
  return {
    attemptId,
    status: attempt.status,
    testTitle: meta.title,
    seriesTitle: meta.series_title,
    negativeMarks: Number(meta.negative_marks),
    deadlineAt: attempt.deadline_at,
    serverNow: new Date().toISOString(),
    questions: questions.map((q) => ({ id: q.id, stem: q.stem, options: q.options, section: q.section, marks: q.marksValue, set: q.set })),
    answers: Object.fromEntries(saved.rows.map((row) => [row.question_id, { selected: row.selected_option, marked: row.marked_for_review }]))
  };
}

export type SaveResult = "saved" | "expired" | "not_found" | "invalid";

export async function saveAnswer(userId: string, attemptId: string, input: { questionId: string; selected: string | null; marked: boolean; timeSpentSeconds: number }): Promise<SaveResult> {
  const db = await getDb();
  if (!db) return "not_found";
  if (input.selected !== null && !["A", "B", "C", "D"].includes(input.selected)) return "invalid";
  const attempt = (await db.query<{ test_id: string; status: string; deadline_at: string }>("select test_id, status, deadline_at::text from test_attempts where id = $1 and user_id = $2", [attemptId, userId])).rows[0];
  if (!attempt) return "not_found";
  if (attempt.status !== "in_progress" || new Date(attempt.deadline_at).getTime() + GRACE_SECONDS * 1000 < Date.now()) return "expired";
  const member = await db.query("select 1 from test_questions where test_id = $1 and question_id = $2", [attempt.test_id, input.questionId]);
  if (!member.rowCount) return "invalid";
  await db.query(
    `insert into attempt_answers (attempt_id, question_id, selected_option, marked_for_review, time_spent_seconds) values ($1,$2,$3,$4,$5)
     on conflict (attempt_id, question_id) do update set selected_option = excluded.selected_option, marked_for_review = excluded.marked_for_review,
       time_spent_seconds = attempt_answers.time_spent_seconds + excluded.time_spent_seconds`,
    [attemptId, input.questionId, input.selected, input.marked, Math.max(0, Math.min(600, Math.round(input.timeSpentSeconds)))]
  );
  return "saved";
}

async function finalizeAttempt(db: Db, attemptId: string) {
  const attempt = (await db.query<{ test_id: string; status: string; started_at: string }>("select test_id, status, started_at::text from test_attempts where id = $1", [attemptId])).rows[0];
  if (!attempt || attempt.status === "submitted") return;
  const meta = (await db.query<{ negative_marks: string; default_marks: string }>("select negative_marks, default_marks from tests where id = $1", [attempt.test_id])).rows[0];
  const questions = await loadQuestions(db, attempt.test_id, Number(meta.default_marks));
  const saved = await db.query<{ question_id: string; selected_option: string | null }>("select question_id, selected_option from attempt_answers where attempt_id = $1", [attemptId]);
  const answers = Object.fromEntries(saved.rows.map((row) => [row.question_id, row.selected_option]));
  const scorable: ScorableQuestion[] = questions.map((q) => ({ id: q.id, section: q.section, subject: q.subject, topic: q.topic, correct: q.correct_option, marks: q.marksValue }));
  const result = scoreAttempt(scorable, answers, Number(meta.negative_marks));
  const spent = (await db.query<{ n: string }>("select coalesce(sum(time_spent_seconds), 0) as n from attempt_answers where attempt_id = $1", [attemptId])).rows[0];
  await db.query(
    `update test_attempts set status = 'submitted', submitted_at = now(), score = $2, correct_count = $3, incorrect_count = $4, unattempted_count = $5,
       time_spent_seconds = $6, result_json = $7 where id = $1 and status = 'in_progress'`,
    [attemptId, result.score, result.correct, result.incorrect, result.unattempted, Number(spent.n), JSON.stringify(result)]
  );
}

export async function submitAttempt(userId: string, attemptId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const owned = await db.query("select 1 from test_attempts where id = $1 and user_id = $2", [attemptId, userId]);
  if (!owned.rowCount) return false;
  await db.transaction((tx) => finalizeAttempt(tx, attemptId));
  return true;
}

export type SolutionRow = { id: string; section: string; stem: string; options: Record<string, string>; correct: string; selected: string | null; explanation: string; topic: string; marks: number; outcome: "correct" | "incorrect" | "unattempted"; set: QuestionSet | null };

export type ResultData = {
  attemptId: string;
  testId: string;
  testTitle: string;
  seriesTitle: string;
  seriesSlug: string;
  examSlug: string;
  testSlug: string;
  submittedAt: string;
  timeSpentSeconds: number;
  result: ScoreResult;
  solutions: SolutionRow[];
};

export async function getResultData(userId: string, attemptId: string): Promise<ResultData | null> {
  const db = await getDb();
  if (!db) return null;
  const attempt = (await db.query<{ id: string; test_id: string; status: string; submitted_at: string | null; time_spent_seconds: number | null; result_json: ScoreResult | null }>(
    "select id, test_id, status, submitted_at::text, time_spent_seconds, result_json from test_attempts where id = $1 and user_id = $2", [attemptId, userId])).rows[0];
  if (!attempt || attempt.status !== "submitted" || !attempt.result_json) return null;
  const meta = (await db.query<{ title: string; slug: string; series_title: string; series_slug: string; exam_slug: string; default_marks: string }>(
    `select t.title, t.slug, s.title as series_title, s.slug as series_slug, e.slug as exam_slug, t.default_marks
     from tests t join test_series s on s.id = t.series_id join exams e on e.id = s.exam_id where t.id = $1`, [attempt.test_id])).rows[0];
  const questions = await loadQuestions(db, attempt.test_id, Number(meta.default_marks));
  const saved = await db.query<{ question_id: string; selected_option: string | null }>("select question_id, selected_option from attempt_answers where attempt_id = $1", [attemptId]);
  const given = new Map(saved.rows.map((row) => [row.question_id, row.selected_option]));
  return {
    attemptId,
    testId: attempt.test_id,
    testTitle: meta.title,
    seriesTitle: meta.series_title,
    seriesSlug: meta.series_slug,
    examSlug: meta.exam_slug,
    testSlug: meta.slug,
    submittedAt: attempt.submitted_at ?? "",
    timeSpentSeconds: attempt.time_spent_seconds ?? 0,
    result: attempt.result_json,
    solutions: questions.map((q) => {
      const selected = given.get(q.id) ?? null;
      return { id: q.id, section: q.section, stem: q.stem, options: q.options, correct: q.correct_option, selected, explanation: q.explanation, topic: `${q.subject} / ${q.topic}`, marks: q.marksValue, outcome: !selected ? "unattempted" : selected === q.correct_option ? "correct" : "incorrect", set: q.set };
    })
  };
}

export async function listAttempts(userId: string) {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ id: string; status: string; started_at: string; score: number | null; test_title: string; series_title: string; max_score: number | null }>(
    `select a.id, a.status, a.started_at::text, a.score, t.title as test_title, s.title as series_title, (a.result_json->>'maxScore')::numeric as max_score
     from test_attempts a join tests t on t.id = a.test_id join test_series s on s.id = t.series_id where a.user_id = $1 order by a.started_at desc limit 50`,
    [userId]
  );
  return rows;
}

export async function listAccessibleSeries(userId: string) {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ title: string; slug: string; exam_slug: string; expires_at: string | null }>(
    `select s.title, s.slug, e.slug as exam_slug, a.expires_at::text from test_access a join test_series s on s.id = a.series_id join exams e on e.id = s.exam_id
     where a.user_id = $1 and (a.expires_at is null or a.expires_at > now()) order by a.created_at desc`,
    [userId]
  );
  return rows;
}
