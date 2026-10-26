import { getDb, type Db } from "@/lib/db";
import { IST_DAY, hasAnyPaidAccess } from "@/lib/offers";

export { LEVELS, SESSION_SIZE, PROMOTE_AT, SESSIONS_TO_PROMOTE } from "@/lib/practice-shared";
export type { Level, PracticeQuestion, PracticeSession, SubjectSummary } from "@/lib/practice-shared";
import { LEVELS, PROMOTE_AT, SESSION_SIZE, SESSIONS_TO_PROMOTE, type Level, type PracticeSession, type SubjectSummary } from "@/lib/practice-shared";

export const FREE_SESSIONS_PER_DAY = 1;

const difficultyFor: Record<Level, string> = { beginner: "easy", intermediate: "moderate", advanced: "hard" };
const fallbackOrder: Record<string, string[]> = { easy: ["moderate", "hard"], moderate: ["easy", "hard"], hard: ["moderate", "easy"] };


export async function getSubjects(): Promise<SubjectSummary[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.query<{ subject: string; topic: string; n: string }>(
    "select subject, topic, count(*) as n from questions where validation_status = 'published' group by subject, topic order by subject, topic"
  );
  const bySubject = new Map<string, SubjectSummary>();
  for (const row of result.rows) {
    const entry = bySubject.get(row.subject) ?? { subject: row.subject, questions: 0, topics: [] };
    entry.questions += Number(row.n);
    entry.topics.push(row.topic);
    bySubject.set(row.subject, entry);
  }
  return [...bySubject.values()].filter((entry) => entry.questions >= 1);
}

export async function getLevels(userId: string): Promise<Record<string, { level: Level; goodSessions: number }>> {
  const db = await getDb();
  if (!db) return {};
  const result = await db.query<{ subject: string; level: Level; good_sessions: number }>("select subject, level, good_sessions from practice_levels where user_id = $1", [userId]);
  return Object.fromEntries(result.rows.map((row) => [row.subject, { level: row.level, goodSessions: Number(row.good_sessions) }]));
}

// Picks random published questions for one difficulty. The offset trick avoids sorting the whole bank by random(),
// which would be slow with lakhs of questions; ids are random UUIDs, so a window of ids is already a random sample.
async function pickQuestions(db: Db, subject: string, topic: string | null, difficulty: string, count: number, exclude: string[]) {
  const filter = "validation_status = 'published' and subject = $1 and ($2::text is null or topic = $2) and difficulty = $3 and not (id = any($4::uuid[]))";
  const total = Number((await db.query<{ n: string }>(`select count(*) as n from questions where ${filter}`, [subject, topic, difficulty, exclude])).rows[0].n);
  if (!total) return [];
  const offset = Math.floor(Math.random() * Math.max(0, total - count + 1));
  const rows = await db.query<{ id: string }>(`select id from questions where ${filter} order by id limit $5 offset $6`, [subject, topic, difficulty, exclude, count, offset]);
  return rows.rows.map((row) => row.id);
}

export async function startSession(userId: string, subject: string, topic: string | null): Promise<{ ok: true; sessionId: string } | { ok: false; reason: "no_questions" | "daily_limit" }> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "no_questions" };

  const open = (await db.query<{ id: string }>("select id from practice_sessions where user_id = $1 and subject = $2 and status = 'in_progress' and ($3::text is null or topic = $3) order by created_at desc limit 1", [userId, subject, topic])).rows[0];
  if (open) return { ok: true, sessionId: open.id };

  // Free accounts get one new practice session a day; an Exam Pass removes the limit.
  const started = Number((await db.query<{ n: string }>(`select count(*) as n from practice_sessions where user_id = $1 and (created_at at time zone 'Asia/Kolkata')::date = ${IST_DAY}`, [userId])).rows[0].n);
  if (started >= FREE_SESSIONS_PER_DAY && !(await hasAnyPaidAccess(userId, db))) return { ok: false, reason: "daily_limit" };

  const levelRow = (await db.query<{ level: Level }>("select level from practice_levels where user_id = $1 and subject = $2", [userId, subject])).rows[0];
  const level: Level = levelRow?.level ?? "beginner";
  const target = difficultyFor[level];
  let ids = await pickQuestions(db, subject, topic, target, SESSION_SIZE, []);
  for (const other of fallbackOrder[target]) {
    if (ids.length >= SESSION_SIZE) break;
    ids = ids.concat(await pickQuestions(db, subject, topic, other, SESSION_SIZE - ids.length, ids));
  }
  if (!ids.length) return { ok: false, reason: "no_questions" };

  const session = (await db.query<{ id: string }>("insert into practice_sessions (user_id, subject, topic, level, total) values ($1,$2,$3,$4,$5) returning id", [userId, subject, topic, level, ids.length])).rows[0];
  for (const [position, questionId] of ids.entries()) {
    await db.query("insert into practice_answers (session_id, question_id, position) values ($1,$2,$3)", [session.id, questionId, position]);
  }
  return { ok: true, sessionId: session.id };
}


// Correct answers and explanations are only included for questions the learner has already answered.
export async function getSession(userId: string, sessionId: string): Promise<PracticeSession | null> {
  const db = await getDb();
  if (!db || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  const session = (await db.query<{ id: string; subject: string; topic: string | null; level: Level; status: "in_progress" | "completed"; total: number; correct: number }>(
    "select id, subject, topic, level, status, total, correct from practice_sessions where id = $1 and user_id = $2", [sessionId, userId])).rows[0];
  if (!session) return null;
  const rows = await db.query<{ id: string; stem: string; options: Record<string, string>; position: number; selected_option: string | null; correct_option: string; explanation: string }>(
    `select q.id, q.stem, q.options, pa.position, pa.selected_option, q.correct_option, q.explanation
       from practice_answers pa join questions q on q.id = pa.question_id where pa.session_id = $1 order by pa.position`, [sessionId]);
  return {
    ...session,
    total: Number(session.total),
    correct: Number(session.correct),
    questions: rows.rows.map((row) => ({
      id: row.id, stem: row.stem, options: row.options, position: row.position, selected: row.selected_option,
      correctOption: row.selected_option ? row.correct_option : null, explanation: row.selected_option ? row.explanation : null
    }))
  };
}

export type AnswerResult =
  | { ok: true; correct: boolean; correctOption: string; explanation: string; finished: null | { score: number; total: number; percent: number; levelBefore: Level; levelAfter: Level; goodSessions: number; promoted: boolean } }
  | { ok: false; reason: "not_found" | "already_answered" | "completed" };

export async function answerQuestion(userId: string, sessionId: string, questionId: string, selected: string): Promise<AnswerResult> {
  const db = await getDb();
  if (!db) return { ok: false, reason: "not_found" };
  const session = (await db.query<{ status: string; subject: string; level: Level }>("select status, subject, level from practice_sessions where id = $1 and user_id = $2", [sessionId, userId])).rows[0];
  if (!session) return { ok: false, reason: "not_found" };
  if (session.status === "completed") return { ok: false, reason: "completed" };
  const row = (await db.query<{ selected_option: string | null; correct_option: string; explanation: string }>(
    "select pa.selected_option, q.correct_option, q.explanation from practice_answers pa join questions q on q.id = pa.question_id where pa.session_id = $1 and pa.question_id = $2", [sessionId, questionId])).rows[0];
  if (!row) return { ok: false, reason: "not_found" };
  if (row.selected_option) return { ok: false, reason: "already_answered" };

  const correct = row.correct_option === selected;
  await db.query("update practice_answers set selected_option = $3, is_correct = $4, answered_at = now() where session_id = $1 and question_id = $2 and selected_option is null", [sessionId, questionId, selected, correct]);

  const remaining = Number((await db.query<{ n: string }>("select count(*) as n from practice_answers where session_id = $1 and selected_option is null", [sessionId])).rows[0].n);
  let finished: Extract<AnswerResult, { ok: true }>["finished"] = null;
  if (remaining === 0) {
    const tally = (await db.query<{ total: string; correct: string }>("select count(*) as total, count(*) filter (where is_correct) as correct from practice_answers where session_id = $1", [sessionId])).rows[0];
    const total = Number(tally.total);
    const score = Number(tally.correct);
    const done = await db.query("update practice_sessions set status = 'completed', correct = $2, total = $3, finished_at = now() where id = $1 and status = 'in_progress'", [sessionId, score, total]);
    if (done.rowCount > 0) finished = { ...(await updateLevel(db, userId, session.subject, score, total)), score, total };
    else finished = null;
  }
  return { ok: true, correct, correctOption: row.correct_option, explanation: row.explanation, finished };
}

async function updateLevel(db: Db, userId: string, subject: string, score: number, total: number) {
  const percent = total ? score / total : 0;
  const current = (await db.query<{ level: Level; good_sessions: number }>("select level, good_sessions from practice_levels where user_id = $1 and subject = $2", [userId, subject])).rows[0];
  const levelBefore: Level = current?.level ?? "beginner";
  let good = Number(current?.good_sessions ?? 0);
  let level = levelBefore;
  let promoted = false;
  if (percent >= PROMOTE_AT) good += 1;
  else good = 0;
  if (good >= SESSIONS_TO_PROMOTE && level !== "advanced") {
    level = LEVELS[LEVELS.indexOf(level) + 1];
    good = 0;
    promoted = true;
  }
  await db.query(
    `insert into practice_levels (user_id, subject, level, good_sessions) values ($1,$2,$3,$4)
     on conflict (user_id, subject) do update set level = excluded.level, good_sessions = excluded.good_sessions, updated_at = now()`,
    [userId, subject, level, good]
  );
  return { percent: Math.round(percent * 100), levelBefore, levelAfter: level, goodSessions: good, promoted };
}
