import { getDb } from "@/lib/db";

export type SeriesSummary = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  examSlug: string;
  examName: string;
  pricePaise: number;
  mrpPaise: number | null;
  testCount: number;
  questionCount: number;
  freeSampleCount: number;
  publishedAt: string | null;
};

export type TestSummary = {
  id: string;
  slug: string;
  title: string;
  instructions: string | null;
  durationMinutes: number;
  defaultMarks: number;
  negativeMarks: number;
  isFreeSample: boolean;
  position: number;
  questionCount: number;
  kind: "full" | "sectional" | "topic";
  level: "beginner" | "intermediate" | "advanced" | null;
  subject: string | null;
  topic: string | null;
  sections: Array<{ name: string; questions: number }>;
};

type SeriesRow = {
  id: string; slug: string; title: string; description: string | null; exam_slug: string; exam_name: string;
  price_paise: number; mrp_paise: number | null; published_at: string | null; test_count: string; question_count: string; free_count: string;
};

const SERIES_SELECT = `
  select s.id, s.slug, s.title, s.description, e.slug as exam_slug, e.name as exam_name, s.price_paise, s.mrp_paise, s.published_at::text as published_at,
         (select count(*) from tests t where t.series_id = s.id and t.status = 'published') as test_count,
         (select count(*) from questions q where q.exam_id = s.exam_id and q.validation_status = 'published') as question_count,
         (select count(*) from tests t where t.series_id = s.id and t.status = 'published' and t.is_free_sample) as free_count
  from test_series s join exams e on e.id = s.exam_id and e.active = true
  where s.status = 'published'`;

function toSeries(row: SeriesRow): SeriesSummary {
  return {
    id: row.id, slug: row.slug, title: row.title, description: row.description, examSlug: row.exam_slug, examName: row.exam_name,
    pricePaise: row.price_paise, mrpPaise: row.mrp_paise, testCount: Number(row.test_count), questionCount: Number(row.question_count),
    freeSampleCount: Number(row.free_count), publishedAt: row.published_at
  };
}

export async function getPublishedSeries(examSlug?: string): Promise<SeriesSummary[]> {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<SeriesRow>(`${SERIES_SELECT} ${examSlug ? "and e.slug = $1" : ""} order by s.published_at desc`, examSlug ? [examSlug] : []);
  return rows.map(toSeries);
}

export async function getSeries(examSlug: string, seriesSlug: string): Promise<SeriesSummary | null> {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<SeriesRow>(`${SERIES_SELECT} and e.slug = $1 and s.slug = $2`, [examSlug, seriesSlug]);
  return rows[0] ? toSeries(rows[0]) : null;
}

export async function getExam(examSlug: string) {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<{ id: string; slug: string; name: string; description: string | null }>("select id, slug, name, description from exams where slug = $1 and active = true", [examSlug]);
  return rows[0] ?? null;
}

type TestRow = {
  id: string; slug: string; title: string; instructions: string | null; duration_minutes: number; default_marks: string; negative_marks: string;
  is_free_sample: boolean; position: number; question_count: string;
  kind: "full" | "sectional" | "topic"; level: "beginner" | "intermediate" | "advanced" | null; subject: string | null; topic: string | null;
};

function toTest(row: TestRow, sections: Array<{ name: string; questions: number }>): TestSummary {
  return {
    id: row.id, slug: row.slug, title: row.title, instructions: row.instructions, durationMinutes: row.duration_minutes,
    defaultMarks: Number(row.default_marks), negativeMarks: Number(row.negative_marks), isFreeSample: row.is_free_sample,
    position: row.position, questionCount: Number(row.question_count), kind: row.kind, level: row.level, subject: row.subject, topic: row.topic, sections
  };
}

async function sectionsFor(testIds: string[]) {
  const db = await getDb();
  const map = new Map<string, Array<{ name: string; questions: number }>>();
  if (!db || !testIds.length) return map;
  const { rows } = await db.query<{ test_id: string; name: string; n: string }>(
    `select ts.test_id, ts.name, (select count(*) from test_questions tq where tq.section_id = ts.id) as n
     from test_sections ts where ts.test_id = any($1) order by ts.position`,
    [testIds]
  );
  for (const row of rows) map.set(row.test_id, [...(map.get(row.test_id) ?? []), { name: row.name, questions: Number(row.n) }]);
  return map;
}

export async function getSeriesTests(seriesId: string): Promise<TestSummary[]> {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<TestRow>(
    `select t.id, t.slug, t.title, t.instructions, t.duration_minutes, t.default_marks, t.negative_marks, t.is_free_sample, t.position,
            (select count(*) from test_questions tq where tq.test_id = t.id) as question_count, t.kind, t.level, t.subject, t.topic
     from tests t where t.series_id = $1 and t.status = 'published' order by t.position, t.created_at`,
    [seriesId]
  );
  const sections = await sectionsFor(rows.map((row) => row.id));
  return rows.map((row) => toTest(row, sections.get(row.id) ?? []));
}

const TEST_COLUMNS = `t.id, t.slug, t.title, t.instructions, t.duration_minutes, t.default_marks, t.negative_marks, t.is_free_sample, t.position,
  (select count(*) from test_questions tq where tq.test_id = t.id) as question_count, t.kind, t.level, t.subject, t.topic`;

// One test by slug. Series can hold hundreds of tests, so this never loads the whole list.
export async function getTest(seriesId: string, testSlug: string): Promise<TestSummary | null> {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<TestRow>(`select ${TEST_COLUMNS} from tests t where t.series_id = $1 and t.slug = $2 and t.status = 'published'`, [seriesId, testSlug]);
  if (!rows[0]) return null;
  const sections = await sectionsFor([rows[0].id]);
  return toTest(rows[0], sections.get(rows[0].id) ?? []);
}

export type SeriesGroup = { kind: "full" | "sectional" | "topic"; level: "beginner" | "intermediate" | "advanced" | null; count: number; freeSamples: number };

const LEVEL_ORDER = { beginner: 1, intermediate: 2, advanced: 3 } as const;
const KIND_ORDER = { full: 0, sectional: 1, topic: 2 } as const;

// How the tests of a series are organised: by type and level, with counts. Cheap even for hundreds of tests.
export async function getSeriesGroups(seriesId: string): Promise<SeriesGroup[]> {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ kind: SeriesGroup["kind"]; level: SeriesGroup["level"]; n: string; free: string }>(
    "select kind, level, count(*) as n, count(*) filter (where is_free_sample) as free from tests where series_id = $1 and status = 'published' group by kind, level", [seriesId]);
  return rows
    .map((row) => ({ kind: row.kind, level: row.level, count: Number(row.n), freeSamples: Number(row.free) }))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.level ? LEVEL_ORDER[a.level] : 0) - (b.level ? LEVEL_ORDER[b.level] : 0));
}

export const PAGE_SIZE = 30;

export async function listSeriesTests(seriesId: string, options: { kind?: string | null; level?: string | null; page?: number; limit?: number }): Promise<{ tests: TestSummary[]; total: number }> {
  const db = await getDb();
  if (!db) return { tests: [], total: 0 };
  const limit = options.limit ?? PAGE_SIZE;
  const offset = Math.max(0, ((options.page ?? 1) - 1) * limit);
  const filter = "t.series_id = $1 and t.status = 'published' and ($2::text is null or t.kind = $2) and ($3::text is null or ($3 = 'all' and t.level is null) or t.level = $3)";
  const params = [seriesId, options.kind ?? null, options.level ?? null];
  const [rows, total] = await Promise.all([
    db.query<TestRow>(`select ${TEST_COLUMNS} from tests t where ${filter} order by t.position, t.created_at limit ${limit} offset ${offset}`, params),
    db.query<{ n: string }>(`select count(*) as n from tests t where ${filter}`, params)
  ]);
  return { tests: rows.rows.map((row) => toTest(row, [])), total: Number(total.rows[0].n) };
}

export async function getSampleTests(seriesId: string): Promise<Array<{ slug: string }>> {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ slug: string }>("select slug from tests where series_id = $1 and status = 'published' and is_free_sample", [seriesId]);
  return rows;
}

// Exams that have at least one published series, without the counts, for the menus on every page.
export async function getLiveExams(): Promise<Array<{ slug: string; name: string }>> {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ slug: string; name: string }>(
    "select distinct e.slug, e.name from exams e join test_series s on s.exam_id = e.id where e.active and s.status = 'published' order by e.name");
  return rows;
}

export function formatPrice(paise: number) {
  if (paise === 0) return "Free";
  const rupees = paise / 100;
  return `₹${paise % 100 === 0 ? rupees.toLocaleString("en-IN") : rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function discountPercent(pricePaise: number, mrpPaise: number | null) {
  if (!mrpPaise || mrpPaise <= pricePaise) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}

export async function getSeriesBySlug(slug: string): Promise<SeriesSummary | null> {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<SeriesRow>(`${SERIES_SELECT} and s.slug = $1`, [slug]);
  return rows[0] ? toSeries(rows[0]) : null;
}
