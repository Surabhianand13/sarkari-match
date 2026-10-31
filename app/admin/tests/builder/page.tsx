import { AdminHeader, Card, DataTable, Field, Td, inputClass } from "@/components/admin/ui";
import { publishBuilt, runBuilder } from "@/app/admin/tests/builder/actions";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Test builder" };

type Result = {
  form?: Record<string, string>; error?: string; published?: number; intent?: "preview" | "create"; prefix?: string;
  report?: { created: number; planned: number; wanted: number; shortages: string[]; availability: Array<{ section: string; easy: number; moderate: number; hard: number; total: number }>; titles: string[] };
};

function decode(value: string | undefined): Result {
  if (!value) return {};
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Result;
  } catch {
    return {};
  }
}

const defaultSections = "Reasoning | Reasoning | 25\nGeneral Awareness | General Awareness | 25\nQuantitative Aptitude | Quantitative Aptitude | 25\nEnglish | English | 25";

export default async function TestBuilderPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const result = decode((await searchParams).r);
  const form = result.form ?? {};
  const db = await adminDb();
  const [series, bank, tests] = await Promise.all([
    db.query<{ id: string; title: string; exam: string }>("select s.id, s.title, e.name as exam from test_series s join exams e on e.id = s.exam_id order by e.name, s.title"),
    db.query<{ exam: string; subject: string; difficulty: string; n: string }>(
      "select e.name as exam, q.subject, q.difficulty, count(*) as n from questions q join exams e on e.id = q.exam_id where q.validation_status = 'published' group by 1, 2, 3 order by 1, 2, 3"),
    db.query<{ series: string; kind: string; level: string | null; status: string; n: string }>(
      "select s.title as series, t.kind, t.level, t.status, count(*) as n from tests t join test_series s on s.id = t.series_id group by 1, 2, 3, 4 order by 1, 2, 3, 4")
  ]);
  const subjects = new Map<string, { exam: string; easy: number; moderate: number; hard: number }>();
  for (const row of bank.rows) {
    const key = `${row.exam}|${row.subject}`;
    const entry = subjects.get(key) ?? { exam: row.exam, easy: 0, moderate: 0, hard: 0 };
    (entry as Record<string, number | string>)[row.difficulty] = Number(row.n);
    subjects.set(key, entry);
  }
  const v = (key: string, fallback: string) => form[key] ?? fallback;
  const report = result.report;

  return (
    <div className="grid max-w-5xl gap-5">
      <AdminHeader title="Test builder" description="Create many tests at once from the published question bank. Preview first: nothing is written until you press Create. New tests start as drafts." />
      {result.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-error">{result.error}</p>}
      {result.published !== undefined && <p role="status" className="rounded-xl bg-mint px-4 py-3 text-sm font-bold text-success">{result.published} draft tests published.</p>}
      {report && (
        <Card title={result.intent === "create" ? (report.created ? `Created ${report.created} tests` : "Nothing was created") : "Preview"}>
          <p className="text-sm font-semibold text-primary">
            {result.intent === "create" ? (report.created ? `${report.created} draft tests added.` : "The bank could not supply the request, so no tests were written.") : `${report.planned} of ${report.wanted} tests can be built.`}
            {report.titles.length > 0 && ` First titles: ${report.titles.join(", ")}.`}
          </p>
          {report.shortages.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-6 text-sm font-bold text-error">{report.shortages.map((line) => <li key={line}>{line}</li>)}</ul>
          )}
          <div className="mt-4">
            <DataTable headers={["Section", "Easy", "Moderate", "Hard", "Total in bank"]}>
              {report.availability.map((row) => <tr key={row.section}><Td>{row.section}</Td><Td>{row.easy}</Td><Td>{row.moderate}</Td><Td>{row.hard}</Td><Td>{row.total}</Td></tr>)}
            </DataTable>
          </div>
        </Card>
      )}
      <form action={runBuilder} className="grid gap-5 rounded-2xl border border-border bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Series">
            <select name="series_id" required defaultValue={v("series_id", "")} className={inputClass}>
              <option value="">Choose...</option>
              {series.rows.map((item) => <option key={item.id} value={item.id}>{item.exam}: {item.title}</option>)}
            </select>
          </Field>
          <Field label="Test type">
            <select name="kind" defaultValue={v("kind", "full")} className={inputClass}>
              <option value="full">Full-length mock</option>
              <option value="sectional">Subject test (sectional)</option>
              <option value="topic">Topic test</option>
            </select>
          </Field>
          <Field label="Level" hint="Sets the easy, moderate, hard mix.">
            <select name="level" defaultValue={v("level", "beginner")} className={inputClass}>
              <option value="beginner">Beginner (60% easy, 35% moderate, 5% hard)</option>
              <option value="intermediate">Intermediate (25 / 55 / 20)</option>
              <option value="advanced">Advanced (10 / 45 / 45)</option>
            </select>
          </Field>
          <Field label="How many tests" hint="Up to 100 at a time."><input name="count" type="number" min={1} max={100} defaultValue={v("count", "10")} className={inputClass} /></Field>
          <Field label="Title prefix" hint="Empty = for example Beginner Mock. A number is added."><input name="title_prefix" defaultValue={v("title_prefix", "")} maxLength={80} className={inputClass} /></Field>
          <Field label="Status of new tests">
            <select name="status" defaultValue={v("status", "draft")} className={inputClass}><option value="draft">Draft (recommended)</option><option value="published">Published</option></select>
          </Field>
          <Field label="Duration (minutes)"><input name="duration" type="number" min={1} defaultValue={v("duration", "60")} className={inputClass} /></Field>
          <Field label="Marks per question"><input name="marks" type="number" step="0.25" min={0.25} defaultValue={v("marks", "2")} className={inputClass} /></Field>
          <Field label="Negative marks per wrong answer"><input name="negative" type="number" step="0.01" min={0} defaultValue={v("negative", "0.5")} className={inputClass} /></Field>
          <Field label="Most tests one question may appear in" hint="1 = every question used once. Raise it when the bank is smaller than the tests need."><input name="max_reuse" type="number" min={1} max={20} defaultValue={v("max_reuse", "1")} className={inputClass} /></Field>
        </div>
        <Field label="Sections" hint="One per line: Name | subject | number of questions | topic | sets. Topic and the word sets are optional. Write sets to build the section from whole data sets, for example: Data Interpretation | Quantitative Aptitude | 10 | Data Interpretation | sets. The subject must match a subject in the table below.">
          <textarea name="sections" rows={5} defaultValue={v("sections", defaultSections)} className={`${inputClass} font-mono`} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <button name="intent" value="preview" className="min-h-11 rounded-full border border-border bg-white px-5 text-sm font-black text-primary">Preview</button>
          <button name="intent" value="create" className="min-h-11 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">Create tests</button>
        </div>
      </form>

      <Card title="Publish drafts in bulk">
        <form action={publishBuilt} className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <Field label="Series"><select name="series_id" required className={inputClass}><option value="">Choose...</option>{series.rows.map((item) => <option key={item.id} value={item.id}>{item.exam}: {item.title}</option>)}</select></Field>
          <Field label="Type"><select name="kind" className={inputClass}><option value="any">All types</option><option value="full">Full-length</option><option value="sectional">Subject tests</option><option value="topic">Topic tests</option></select></Field>
          <Field label="Level"><select name="level" className={inputClass}><option value="any">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></Field>
          <button className="min-h-11 rounded-full bg-primary px-5 text-sm font-black text-white">Publish drafts</button>
        </form>
      </Card>

      <Card title="Question bank (published questions)">
        <DataTable headers={["Exam", "Subject", "Easy", "Moderate", "Hard", "Total"]} empty="No published questions yet.">
          {[...subjects.entries()].map(([key, row]) => <tr key={key}><Td>{row.exam}</Td><Td>{key.split("|")[1]}</Td><Td>{row.easy}</Td><Td>{row.moderate}</Td><Td>{row.hard}</Td><Td>{row.easy + row.moderate + row.hard}</Td></tr>)}
        </DataTable>
      </Card>
      <Card title="Tests built so far">
        <DataTable headers={["Series", "Type", "Level", "Status", "Tests"]} empty="No tests yet.">
          {tests.rows.map((row, i) => <tr key={i}><Td>{row.series}</Td><Td>{row.kind}</Td><Td>{row.level ?? "all"}</Td><Td>{row.status}</Td><Td>{row.n}</Td></tr>)}
        </DataTable>
      </Card>
    </div>
  );
}
