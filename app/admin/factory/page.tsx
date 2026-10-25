import { AdminHeader, ButtonLinkSmall, Card, DataTable, Field, Flash, StatusPill, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { runFactoryBatch } from "@/app/admin/factory/actions";
import { adminDb } from "@/lib/admin/db";
import { providerStatus } from "@/lib/question-factory/providers";
import { templateTopics } from "@/lib/question-factory/templates";

export const metadata = { title: "Question factory" };

export default async function FactoryPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const batches = await db.query<{ id: string; created_at: string; subject: string; topic: string | null; requested_count: number; generated_count: number; passed_count: number; rejected_count: number; status: string; config: { strategy?: string } }>(
    "select id, created_at::text, subject, topic, requested_count, generated_count, passed_count, rejected_count, status, config from question_batches order by created_at desc limit 15"
  );
  const providers = providerStatus();
  const ready = providers.filter((provider) => provider.ready);

  return (
    <div className="grid gap-4">
      <AdminHeader title="Question factory" description="Generate candidate questions, check them automatically, then approve them in the review queue. Nothing publishes by itself." />
      <Flash notice={notice} error={error} />
      <Card title="AI providers">
        <ul className="grid gap-1 text-sm">
          {providers.map((provider) => (
            <li key={provider.id} className="flex flex-wrap items-center gap-2">
              <StatusPill status={provider.ready ? "approved" : "draft"} />
              <span className="font-black text-primary">{provider.id}</span>
              <span className="text-muted">{provider.ready ? provider.model : provider.note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs font-semibold text-muted">Keys are read from server environment variables and never shown. Use a different provider for the checker than for the writer.</p>
      </Card>
      <Card title="Create a batch">
        <form action={runFactoryBatch} className="grid gap-4 md:grid-cols-3">
          <Field label="Strategy" hint="Templates compute exact answers for Quantitative Aptitude with no AI cost.">
            <select name="strategy" defaultValue="template" className={inputClass}>
              <option value="template">Templates (exact arithmetic)</option>
              <option value="llm" disabled={!ready.length}>AI generated</option>
            </select>
          </Field>
          <Field label="Exam"><input name="exam" defaultValue="SSC CGL" className={inputClass} /></Field>
          <Field label="Tier"><input name="tier" defaultValue="Tier I" className={inputClass} /></Field>
          <Field label="Subject"><input name="subject" defaultValue="Quantitative Aptitude" className={inputClass} /></Field>
          <Field label="Topic" hint={`Templates cover: ${templateTopics.join(", ")}. Leave empty for all.`}><input name="topic" className={inputClass} /></Field>
          <Field label="Difficulty">
            <select name="difficulty" defaultValue="mixed" className={inputClass}>
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="How many" hint="Up to 300 with templates, 25 per run with AI."><input name="count" type="number" min="1" max="300" defaultValue={50} className={inputClass} /></Field>
          <Field label="AI writer">
            <select name="generator" className={inputClass}>
              <option value="">None</option>
              {ready.map((provider) => <option key={provider.id} value={provider.id}>{provider.id} ({provider.model})</option>)}
            </select>
          </Field>
          <Field label="AI checker (independent solver)">
            <select name="solver" className={inputClass}>
              <option value="">None</option>
              {ready.map((provider) => <option key={provider.id} value={provider.id}>{provider.id} ({provider.model})</option>)}
            </select>
          </Field>
          <div className="md:col-span-3"><SubmitButton>Run batch</SubmitButton></div>
        </form>
      </Card>
      <DataTable headers={["Started", "Subject / topic", "Mode", "Requested", "Stored", "Passed or review", "Failed", "Status", ""]} empty="No batches yet.">
        {batches.rows.map((batch) => (
          <tr key={batch.id}>
            <Td className="text-xs">{new Date(batch.created_at).toLocaleString("en-IN")}</Td>
            <Td>{batch.subject}{batch.topic ? ` / ${batch.topic}` : ""}</Td>
            <Td>{batch.config?.strategy ?? "-"}</Td>
            <Td>{batch.requested_count}</Td>
            <Td>{batch.generated_count}</Td>
            <Td>{batch.passed_count}</Td>
            <Td>{batch.rejected_count}</Td>
            <Td><StatusPill status={batch.status === "completed" ? "approved" : batch.status === "failed" ? "rejected" : "pending"} /></Td>
            <Td><ButtonLinkSmall href="/admin/questions">Review</ButtonLinkSmall></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
