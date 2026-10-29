import { AdminHeader, Card, DataTable, Field, Flash, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { addSourceAction, deleteSourceAction } from "@/app/admin/factory/sources/actions";
import { adminDb } from "@/lib/admin/db";
import { listSources, sourceKindLabels, sourceKinds } from "@/lib/question-factory/knowledge";

export const metadata = { title: "Factory sources" };

const hints: Record<string, string> = {
  syllabus: "Writers stay inside it, and questions on topics it does not list are flagged.",
  current_affairs: "Used for factual questions. Add a date, and the factory warns when it is over a year old.",
  pyq: "Used only for style and level, and to reject questions that are too close to a past paper. Never reprinted.",
  reference: "Any notes or textbook extracts you want the writers to rely on."
};

export default async function SourcesPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const sources = await listSources(await adminDb());

  return (
    <div className="grid gap-4">
      <AdminHeader title="Factory sources" description="Material the question writers and checkers work from, per exam and subject: the official syllabus, current affairs and past papers." action={{ href: "/admin/factory", label: "Back to the factory" }} />
      <Flash notice={notice} error={error} />
      <Card title="Add a source">
        <form action={addSourceAction} className="grid gap-4 md:grid-cols-3">
          <Field label="What is it?" hint="Each kind is used differently, see below.">
            <select name="kind" defaultValue="syllabus" className={inputClass}>
              {sourceKinds.map((kind) => <option key={kind} value={kind}>{sourceKindLabels[kind]}</option>)}
            </select>
          </Field>
          <Field label="Title"><input name="title" placeholder="SSC CGL 2024 Tier I syllabus" className={inputClass} /></Field>
          <Field label="Exam"><input name="exam" defaultValue="SSC CGL" className={inputClass} /></Field>
          <Field label="Subject" hint="Leave empty for the whole exam."><input name="subject" placeholder="Quantitative Aptitude" className={inputClass} /></Field>
          <Field label="Topic" hint="Optional."><input name="topic" className={inputClass} /></Field>
          <Field label="As of date" hint="For current affairs."><input name="as_of" type="date" className={inputClass} /></Field>
          <Field label="PDF or text file" hint="Text is read from the file. Scanned PDFs have no text, so paste it instead."><input name="file" type="file" accept=".pdf,.txt,.md,text/plain,application/pdf" className={inputClass} /></Field>
          <div className="md:col-span-2">
            <Field label="Or paste the text"><textarea name="body" rows={5} className={`${inputClass} font-mono`} /></Field>
          </div>
          <div className="md:col-span-3"><SubmitButton>Add source</SubmitButton></div>
        </form>
        <ul className="mt-4 grid gap-1 text-xs font-semibold text-muted">
          {sourceKinds.map((kind) => <li key={kind}><span className="font-black text-primary">{sourceKindLabels[kind]}.</span> {hints[kind]}</li>)}
        </ul>
      </Card>
      <DataTable headers={["Kind", "Title", "Exam / subject", "Size", "As of", ""]} empty="No sources yet. Add the SSC CGL syllabus first.">
        {sources.map((source) => (
          <tr key={source.id}>
            <Td>{sourceKindLabels[source.kind]}</Td>
            <Td>{source.title}{source.file_name ? <span className="block text-xs text-muted">{source.file_name}</span> : null}</Td>
            <Td>{source.exam_slug}{source.subject ? ` / ${source.subject}` : " / all subjects"}{source.topic ? ` / ${source.topic}` : ""}</Td>
            <Td>{source.characters.toLocaleString("en-IN")} characters</Td>
            <Td>{source.as_of ?? "-"}</Td>
            <Td>
              <form action={deleteSourceAction}>
                <input type="hidden" name="id" value={source.id} />
                <SubmitButton variant="danger">Remove</SubmitButton>
              </form>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
