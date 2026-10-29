import { AdminHeader, ButtonLinkSmall, Card, DataTable, Field, Flash, StatusPill, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { startFactoryRun } from "@/app/admin/factory/actions";
import { adminDb } from "@/lib/admin/db";
import { providerStatus } from "@/lib/question-factory/providers";
import { templateTopics } from "@/lib/question-factory/templates";

export const metadata = { title: "Question factory" };

const subjects = ["Quantitative Aptitude", "General Intelligence and Reasoning", "English Comprehension", "General Awareness"];

export default async function FactoryPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const [batches, sources] = await Promise.all([
    db.query<{ id: string; created_at: string; subject: string; topic: string | null; requested_count: number; generated_count: number; passed_count: number; rejected_count: number; status: string; config: { mode?: string; strategy?: string } }>(
      "select id, created_at::text, subject, topic, requested_count, generated_count, passed_count, rejected_count, status, config from question_batches where coalesce((config->>'import')::boolean, false) = false order by created_at desc limit 15"
    ),
    db.query<{ kind: string; n: number }>("select kind, count(*)::int as n from knowledge_sources group by kind")
  ]);
  const ready = providerStatus().filter((provider) => provider.ready);
  const sourceCount = (kind: string) => sources.rows.find((row) => row.kind === kind)?.n ?? 0;

  return (
    <div className="grid gap-4">
      <AdminHeader title="Question factory" description="Questions are written, solved by a second AI, proofread, checked against the syllabus and past papers, de-duplicated and repaired before a person approves them. Nothing publishes by itself." action={{ href: "/admin/factory/sources", label: "Syllabus, current affairs and past papers" }} />
      <Flash notice={notice} error={error} />

      <Card title="Start a run">
        <form action={startFactoryRun} className="grid gap-4 md:grid-cols-3">
          <Field label="Who does the AI work" hint="The chat queue uses the Claude and ChatGPT subscriptions you already have. No API key and no per-question cost.">
            <select name="mode" defaultValue="queue" className={inputClass}>
              <option value="queue">Chat queue: Claude and ChatGPT (recommended to start)</option>
              <option value="rules">No AI: exact arithmetic templates (Quantitative Aptitude only)</option>
              <option value="api" disabled={!ready.length}>AI API{ready.length ? "" : " (no key set)"}</option>
            </select>
          </Field>
          <Field label="AI API provider" hint="Only used when the API option is chosen.">
            <select name="provider" className={inputClass}>
              {ready.length ? ready.map((provider) => <option key={provider.id} value={provider.id}>{provider.id} ({provider.model})</option>) : <option value="">None configured</option>}
            </select>
          </Field>
          <Field label="Exam"><input name="exam" defaultValue="SSC CGL" className={inputClass} /></Field>
          <Field label="Tier"><input name="tier" defaultValue="Tier I" className={inputClass} /></Field>
          <Field label="Subject (category)">
            <input name="subject" list="factory-subjects" defaultValue="Quantitative Aptitude" className={inputClass} />
            <datalist id="factory-subjects">{subjects.map((subject) => <option key={subject} value={subject} />)}</datalist>
          </Field>
          <Field label="Topic" hint={`Leave empty to cover the whole subject. No-AI templates cover: ${templateTopics.join(", ")}.`}><input name="topic" className={inputClass} /></Field>
          <Field label="Difficulty">
            <select name="difficulty" defaultValue="mixed" className={inputClass}>
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="How many" hint="Up to 500 in the chat queue, 1,000 with an API, 2,000 without AI."><input name="count" type="number" min="1" max="2000" defaultValue={20} className={inputClass} /></Field>
          <div className="flex items-end"><SubmitButton>Start run</SubmitButton></div>
        </form>
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-muted">
          Sources on file: {sourceCount("syllabus")} syllabus, {sourceCount("current_affairs")} current affairs, {sourceCount("pyq")} past paper, {sourceCount("reference")} reference. Writers and checkers use these automatically for the same exam and subject.
        </p>
      </Card>

      <DataTable headers={["Started", "Subject / topic", "Mode", "Requested", "Written", "Ready or review", "Rejected", "Status", ""]} empty="No runs yet.">
        {batches.rows.map((batch) => (
          <tr key={batch.id}>
            <Td className="text-xs">{new Date(batch.created_at).toLocaleString("en-IN")}</Td>
            <Td>{batch.subject}{batch.topic ? ` / ${batch.topic}` : ""}</Td>
            <Td>{batch.config?.mode === "queue" ? "Chat queue" : batch.config?.mode === "api" ? "API" : "No AI"}</Td>
            <Td>{batch.requested_count}</Td>
            <Td>{batch.generated_count}</Td>
            <Td>{batch.passed_count}</Td>
            <Td>{batch.rejected_count}</Td>
            <Td><StatusPill status={batch.status === "completed" ? "approved" : batch.status === "failed" || batch.status === "cancelled" ? "rejected" : "pending"} /></Td>
            <Td><ButtonLinkSmall href={`/admin/factory/${batch.id}`}>Open</ButtonLinkSmall></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
