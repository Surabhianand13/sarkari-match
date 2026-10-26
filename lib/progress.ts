import { getDb } from "@/lib/db";
import type { WeakTopic } from "@/lib/study-plan";

export type Progress = {
  activity: Array<{ date: string; count: number }>;
  trend: Array<{ label: string; percent: number; title: string }>;
  subjects: Array<{ subject: string; attempted: number; correct: number; accuracy: number }>;
  weakTopics: WeakTopic[];
  totals: { tests: number; practiceSessions: number; questionsAnswered: number };
};

// Everything on the progress page is computed from the learner's own submitted tests and practice answers.
export async function getProgress(userId: string): Promise<Progress> {
  const db = await getDb();
  const empty: Progress = { activity: [], trend: [], subjects: [], weakTopics: [], totals: { tests: 0, practiceSessions: 0, questionsAnswered: 0 } };
  if (!db) return empty;

  const [activityRows, trendRows, accuracyRows] = await Promise.all([
    db.query<{ day: string; n: string }>(
      `select day::text as day, count(*) as n from (
         select date_trunc('day', submitted_at)::date as day from test_attempts where user_id = $1 and status = 'submitted' and submitted_at > now() - interval '28 days'
         union all
         select date_trunc('day', finished_at)::date from practice_sessions where user_id = $1 and status = 'completed' and finished_at > now() - interval '28 days'
       ) d group by day order by day`, [userId]),
    db.query<{ title: string; percent: string | null; submitted_at: string }>(
      `select t.title, (a.result_json->>'percentage') as percent, a.submitted_at::text as submitted_at
         from test_attempts a join tests t on t.id = a.test_id where a.user_id = $1 and a.status = 'submitted' order by a.submitted_at desc limit 8`, [userId]),
    db.query<{ subject: string; topic: string; attempted: string; correct: string }>(
      `select q.subject, q.topic, count(*) as attempted, count(*) filter (where x.correct) as correct from (
         select aa.question_id, (aa.selected_option = q2.correct_option) as correct from attempt_answers aa
           join test_attempts ta on ta.id = aa.attempt_id join questions q2 on q2.id = aa.question_id
          where ta.user_id = $1 and ta.status = 'submitted' and aa.selected_option is not null
         union all
         select pa.question_id, pa.is_correct from practice_answers pa join practice_sessions ps on ps.id = pa.session_id
          where ps.user_id = $1 and pa.selected_option is not null
       ) x join questions q on q.id = x.question_id group by q.subject, q.topic`, [userId])
  ]);

  const tests = Number((await db.query<{ n: string }>("select count(*) as n from test_attempts where user_id = $1 and status = 'submitted'", [userId])).rows[0].n);
  const practiceSessions = Number((await db.query<{ n: string }>("select count(*) as n from practice_sessions where user_id = $1 and status = 'completed'", [userId])).rows[0].n);

  const bySubject = new Map<string, { attempted: number; correct: number }>();
  const topics: WeakTopic[] = [];
  let answered = 0;
  for (const row of accuracyRows.rows) {
    const attempted = Number(row.attempted);
    const correct = Number(row.correct);
    answered += attempted;
    const entry = bySubject.get(row.subject) ?? { attempted: 0, correct: 0 };
    entry.attempted += attempted;
    entry.correct += correct;
    bySubject.set(row.subject, entry);
    topics.push({ subject: row.subject, topic: row.topic, attempted, accuracy: attempted ? Math.round((correct / attempted) * 100) : 0 });
  }

  const today = new Date();
  const counts = new Map(activityRows.rows.map((row) => [row.day.slice(0, 10), Number(row.n)]));
  const activity = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(today.getTime() - (27 - i) * 86400000);
    const date = d.toISOString().slice(0, 10);
    return { date, count: counts.get(date) ?? 0 };
  });

  return {
    activity,
    trend: trendRows.rows.reverse().map((row, i) => ({ label: `T${i + 1}`, title: row.title, percent: Math.max(0, Math.round(Number(row.percent ?? 0))) })),
    subjects: [...bySubject.entries()].map(([subject, value]) => ({ subject, ...value, accuracy: value.attempted ? Math.round((value.correct / value.attempted) * 100) : 0 })).sort((a, b) => a.accuracy - b.accuracy),
    weakTopics: topics.filter((topic) => topic.attempted >= 3).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5),
    totals: { tests, practiceSessions, questionsAnswered: answered }
  };
}
