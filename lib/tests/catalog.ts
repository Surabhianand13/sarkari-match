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
  sections: Array<{ name: string; questions: number }>;
};

type SeriesRow = {
  id: string; slug: string; title: string; description: string | null; exam_slug: string; exam_name: string;
  price_paise: number; mrp_paise: number | null; published_at: string | null; test_count: string; question_count: string; free_count: string;
};

const SERIES_SELECT = `
  select s.id, s.slug, s.title, s.description, e.slug as exam_slug, e.name as exam_name, s.price_paise, s.mrp_paise, s.published_at::text as published_at,
         (select count(*) from tests t where t.series_id = s.id and t.status = 'published') as test_count,
         (select count(*) from test_questions tq join tests t on t.id = tq.test_id where t.series_id = s.id and t.status = 'published') as question_count,
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
};

function toTest(row: TestRow, sections: Array<{ name: string; questions: number }>): TestSummary {
  return {
    id: row.id, slug: row.slug, title: row.title, instructions: row.instructions, durationMinutes: row.duration_minutes,
    defaultMarks: Number(row.default_marks), negativeMarks: Number(row.negative_marks), isFreeSample: row.is_free_sample,
    position: row.position, questionCount: Number(row.question_count), sections
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
            (select count(*) from test_questions tq where tq.test_id = t.id) as question_count
     from tests t where t.series_id = $1 and t.status = 'published' order by t.position, t.created_at`,
    [seriesId]
  );
  const sections = await sectionsFor(rows.map((row) => row.id));
  return rows.map((row) => toTest(row, sections.get(row.id) ?? []));
}

export async function getTest(seriesId: string, testSlug: string): Promise<TestSummary | null> {
  const tests = await getSeriesTests(seriesId);
  return tests.find((test) => test.slug === testSlug) ?? null;
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
