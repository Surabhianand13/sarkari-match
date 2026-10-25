import { notFound } from "next/navigation";
import { AdminHeader, ButtonLinkSmall, Card, DataTable, Field, Flash, StatusPill, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { addSection, attachQuestions, deleteSection, detachQuestion, saveTest, setTestStatus } from "@/app/admin/tests/actions";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Test" };

export default async function TestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string; subject?: string; topic?: string }> }) {
  const { id } = await params;
  const { notice, error, subject = "", topic = "" } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await adminDb();
  const found = await db.query<Record<string, string | number | boolean | null>>("select t.*, s.title as series_title from tests t join test_series s on s.id = t.series_id where t.id = $1", [id]);
  const test = found.rows[0];
  if (!test) notFound();

  const [sections, attached, candidates] = await Promise.all([
    db.query<{ id: string; name: string }>("select id, name from test_sections where test_id = $1 order by position", [id]),
    db.query<{ question_id: string; position: number; stem: string; subject: string; topic: string; validation_status: string; section: string | null }>(
      `select tq.question_id, tq.position, q.stem, q.subject, q.topic, q.validation_status, ts.name as section
       from test_questions tq join questions q on q.id = tq.question_id left join test_sections ts on ts.id = tq.section_id
       where tq.test_id = $1 order by tq.position`, [id]),
    db.query<{ id: string; stem: string; subject: string; topic: string; difficulty: string; validation_status: string }>(
      `select q.id, q.stem, q.subject, q.topic, q.difficulty, q.validation_status from questions q
       where q.validation_status in ('approved','published') and q.id not in (select question_id from test_questions where test_id = $1)
         and ($2 = '' or q.subject ilike '%' || $2 || '%') and ($3 = '' or q.topic ilike '%' || $3 || '%')
       order by q.created_at desc limit 50`, [id, subject, topic])
  ]);
  const v = (key: string) => String(test[key] ?? "");

  return (
    <div className="grid gap-4">
      <AdminHeader title={v("title")} description={`In series: ${v("series_title")}`} />
      <Flash notice={notice} error={error} />
      <Card title="Status">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={v("status")} />
          <span className="text-xs font-semibold text-muted">{attached.rows.length} questions attached</span>
          {[["published", "Publish"], ["draft", "Unpublish"], ["archived", "Archive"]].filter(([to]) => to !== v("status")).map(([to, label]) => (
            <form key={to} action={setTestStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="to" value={to} />
              <SubmitButton variant={to === "published" ? "primary" : "secondary"}>{label}</SubmitButton>
            </form>
          ))}
          <ButtonLinkSmall href={`/admin/tests/series/${v("series_id")}`}>Back to series</ButtonLinkSmall>
        </div>
      </Card>
      <Card title="Settings">
        <form action={saveTest} className="grid gap-4 md:grid-cols-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="series_id" value={v("series_id")} />
          <Field label="Title"><input name="title" required defaultValue={v("title")} className={inputClass} /></Field>
          <Field label="Slug"><input name="slug" defaultValue={v("slug")} className={inputClass} /></Field>
          <Field label="Position"><input name="position" type="number" defaultValue={v("position")} className={inputClass} /></Field>
          <Field label="Duration (minutes)"><input name="duration_minutes" type="number" min="1" required defaultValue={v("duration_minutes")} className={inputClass} /></Field>
          <Field label="Marks per question"><input name="default_marks" type="number" step="0.25" required defaultValue={v("default_marks")} className={inputClass} /></Field>
          <Field label="Negative marks"><input name="negative_marks" type="number" step="0.25" min="0" required defaultValue={v("negative_marks")} className={inputClass} /></Field>
          <label className="flex items-center gap-2 text-sm font-black text-primary"><input type="checkbox" name="is_free_sample" defaultChecked={Boolean(test.is_free_sample)} className="size-4" /> Free sample test</label>
          <div className="md:col-span-3"><Field label="Instructions shown before the test"><textarea name="instructions" rows={3} defaultValue={v("instructions")} className={inputClass} /></Field></div>
          <div className="md:col-span-3"><SubmitButton>Save settings</SubmitButton></div>
        </form>
      </Card>
      <Card title="Sections">
        <ul className="mb-3 flex flex-wrap gap-2">
          {sections.rows.map((section) => (
            <li key={section.id} className="flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm font-black text-primary">
              {section.name}
              <form action={deleteSection}>
                <input type="hidden" name="test_id" value={id} />
                <input type="hidden" name="section_id" value={section.id} />
                <button aria-label={`Remove ${section.name}`} className="text-error">×</button>
              </form>
            </li>
          ))}
          {!sections.rows.length && <li className="text-sm text-muted">No sections. Add one per paper section, for example Quantitative Aptitude.</li>}
        </ul>
        <form action={addSection} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="test_id" value={id} />
          <Field label="New section"><input name="name" required className={inputClass} /></Field>
          <SubmitButton variant="secondary">Add section</SubmitButton>
        </form>
      </Card>
      <Card title="Attached questions">
        <DataTable headers={["#", "Question", "Subject / topic", "Section", "Bank status", ""]} empty="No questions attached yet.">
          {attached.rows.map((row, index) => (
            <tr key={row.question_id}>
              <Td>{index + 1}</Td>
              <Td className="max-w-md">{row.stem}</Td>
              <Td>{row.subject} / {row.topic}</Td>
              <Td>{row.section ?? "-"}</Td>
              <Td><StatusPill status={row.validation_status} /></Td>
              <Td>
                <form action={detachQuestion}>
                  <input type="hidden" name="test_id" value={id} />
                  <input type="hidden" name="question_id" value={row.question_id} />
                  <button className="font-black text-error underline">Remove</button>
                </form>
              </Td>
            </tr>
          ))}
        </DataTable>
      </Card>
      <Card title="Add approved questions">
        <form className="mb-4 flex flex-wrap items-end gap-3" method="get">
          <Field label="Subject"><input name="subject" defaultValue={subject} className={inputClass} /></Field>
          <Field label="Topic"><input name="topic" defaultValue={topic} className={inputClass} /></Field>
          <SubmitButton variant="secondary">Filter</SubmitButton>
        </form>
        <form action={attachQuestions} className="grid gap-3">
          <input type="hidden" name="test_id" value={id} />
          <DataTable headers={["", "Question", "Subject / topic", "Difficulty", "Status"]} empty="No approved questions match. Approve questions in the review queue first.">
            {candidates.rows.map((q) => (
              <tr key={q.id}>
                <Td><input type="checkbox" name="question_id" value={q.id} className="size-4" aria-label="Select question" /></Td>
                <Td className="max-w-md">{q.stem}</Td>
                <Td>{q.subject} / {q.topic}</Td>
                <Td>{q.difficulty}</Td>
                <Td><StatusPill status={q.validation_status} /></Td>
              </tr>
            ))}
          </DataTable>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Put into section">
              <select name="section_id" className={inputClass}>
                <option value="">No section</option>
                {sections.rows.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
              </select>
            </Field>
            <SubmitButton>Add selected</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
