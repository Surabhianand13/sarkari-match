import { getDb } from "@/lib/db";

export type NextTest = { seriesTitle: string; examSlug: string; seriesSlug: string; testSlug: string; title: string; level: string | null; kind: string };

// For each series the learner can open: the first test they have not submitted yet, working through beginner, then intermediate, then advanced,
// full-length mocks before subject and topic tests.
export async function getNextTests(userId: string): Promise<NextTest[]> {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ series_title: string; exam_slug: string; series_slug: string; test_slug: string; title: string; level: string | null; kind: string }>(
    `select s.title as series_title, e.slug as exam_slug, s.slug as series_slug, n.slug as test_slug, n.title, n.level, n.kind
       from test_series s join exams e on e.id = s.exam_id
       join lateral (
         select t.slug, t.title, t.level, t.kind from tests t
          where t.series_id = s.id and t.status = 'published'
            and not exists (select 1 from test_attempts a where a.test_id = t.id and a.user_id = $1 and a.status = 'submitted')
          order by (case t.level when 'beginner' then 1 when 'intermediate' then 2 when 'advanced' then 3 else 0 end),
                   (case t.kind when 'full' then 0 when 'sectional' then 1 else 2 end), t.position limit 1
       ) n on true
      where exists (select 1 from test_access a where a.user_id = $1 and a.series_id = s.id and a.starts_at <= now() and (a.expires_at is null or a.expires_at > now()))
      order by s.title`, [userId]);
  return rows.map((row) => ({ seriesTitle: row.series_title, examSlug: row.exam_slug, seriesSlug: row.series_slug, testSlug: row.test_slug, title: row.title, level: row.level, kind: row.kind }));
}
