import { notFound } from "next/navigation";
import { AdminHeader, ButtonLinkSmall, Card, DataTable, Field, Flash, StatusPill, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { saveSeries, saveTest, setSeriesStatus } from "@/app/admin/tests/actions";
import { adminDb } from "@/lib/admin/db";
import { paiseToRupees } from "@/lib/admin/forms";

export const metadata = { title: "Test series" };

export default async function SeriesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const exams = (await db.query<{ id: string; name: string }>("select id, name from exams order by name")).rows;

  let series: Record<string, string | number | null> = { exam_id: "", status: "draft", price_paise: 0 };
  if (id !== "new") {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const { rows } = await db.query("select * from test_series where id = $1", [id]);
    if (!rows[0]) notFound();
    series = rows[0] as typeof series;
  }
  const tests = id === "new" ? [] : (await db.query<{ id: string; title: string; duration_minutes: number; status: string; is_free_sample: boolean; questions: string }>(
    `select t.id, t.title, t.duration_minutes, t.status, t.is_free_sample, (select count(*) from test_questions tq where tq.test_id = t.id) as questions
     from tests t where t.series_id = $1 order by t.position, t.created_at`, [id])).rows;
  const v = (key: string) => String(series[key] ?? "");

  return (
    <div className="grid gap-4">
      <AdminHeader title={id === "new" ? "New series" : v("title")} />
      <Flash notice={notice} error={error} />
      {id !== "new" && (
        <Card title="Status">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={v("status")} />
            {[["published", "Publish"], ["draft", "Unpublish"], ["archived", "Archive"]].filter(([to]) => to !== v("status")).map(([to, label]) => (
              <form key={to} action={setSeriesStatus}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="to" value={to} />
                <SubmitButton variant={to === "published" ? "primary" : "secondary"}>{label}</SubmitButton>
              </form>
            ))}
          </div>
        </Card>
      )}
      <Card>
        <form action={saveSeries} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" defaultValue={id === "new" ? "" : id} />
          <Field label="Exam">
            <select name="exam_id" required defaultValue={v("exam_id")} className={inputClass}>
              <option value="">Choose...</option>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
            </select>
          </Field>
          <Field label="Title"><input name="title" required defaultValue={v("title")} className={inputClass} /></Field>
          <Field label="Slug"><input name="slug" defaultValue={v("slug")} className={inputClass} /></Field>
          <Field label="Price (₹)" hint="0 makes the whole series free."><input name="price" type="number" min="0" step="1" required defaultValue={paiseToRupees(series.price_paise as number)} className={inputClass} /></Field>
          <Field label="Original price / MRP (₹)" hint="Optional; shown struck through."><input name="mrp" type="number" min="0" step="1" defaultValue={paiseToRupees(series.mrp_paise as number | null)} className={inputClass} /></Field>
          <div className="md:col-span-2"><Field label="Description"><textarea name="description" rows={4} defaultValue={v("description")} className={inputClass} /></Field></div>
          <div className="md:col-span-2"><SubmitButton>Save series</SubmitButton></div>
        </form>
      </Card>
      {id !== "new" && (
        <>
          <Card title="Tests in this series">
            <DataTable headers={["Test", "Duration", "Questions", "Free sample", "Status", ""]} empty="No tests yet.">
              {tests.map((test) => (
                <tr key={test.id}>
                  <Td className="font-black text-primary">{test.title}</Td>
                  <Td>{test.duration_minutes} min</Td>
                  <Td>{test.questions}</Td>
                  <Td>{test.is_free_sample ? "Yes" : "-"}</Td>
                  <Td><StatusPill status={test.status} /></Td>
                  <Td><ButtonLinkSmall href={`/admin/tests/test/${test.id}`}>Open</ButtonLinkSmall></Td>
                </tr>
              ))}
            </DataTable>
          </Card>
          <Card title="Add a test">
            <form action={saveTest} className="grid gap-4 md:grid-cols-3">
              <input type="hidden" name="series_id" value={id} />
              <Field label="Title"><input name="title" required className={inputClass} /></Field>
              <Field label="Duration (minutes)"><input name="duration_minutes" type="number" min="1" defaultValue={60} required className={inputClass} /></Field>
              <Field label="Position"><input name="position" type="number" defaultValue={tests.length + 1} className={inputClass} /></Field>
              <Field label="Marks per question"><input name="default_marks" type="number" step="0.25" defaultValue={2} required className={inputClass} /></Field>
              <Field label="Negative marks"><input name="negative_marks" type="number" step="0.25" min="0" defaultValue={0.5} required className={inputClass} /></Field>
              <label className="flex items-center gap-2 self-end text-sm font-black text-primary"><input type="checkbox" name="is_free_sample" className="size-4" /> Free sample test</label>
              <div className="md:col-span-3"><SubmitButton>Add test</SubmitButton></div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
