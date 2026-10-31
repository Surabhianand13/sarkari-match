import { notFound } from "next/navigation";
import { AdminHeader, Card, Field, Flash, StatusPill, inputClass } from "@/components/admin/ui";
import { QuestionForm } from "@/components/admin/question-form";
import { setQuestionStatus } from "@/app/admin/questions/actions";
import { adminDb } from "@/lib/admin/db";
import { summariseChecks } from "@/lib/question-factory/checks-summary";
import { canTransition, type ValidationStatus } from "@/lib/tests/question-schema";

export const metadata = { title: "Question" };

type QuestionRow = {
  tier: string | null;
  subject: string;
  topic: string;
  difficulty: string;
  stem: string;
  options: Record<string, string>;
  correct_option: string;
  explanation: string;
  est_time_seconds: number;
  source_type: string;
  validation_status: ValidationStatus;
  validation_notes: Record<string, unknown> | null;
  generator_model: string | null;
  critic_model: string | null;
  prompt_version: string | null;
};

const buttons: Array<[ValidationStatus, string, "primary" | "secondary" | "danger"]> = [
  ["approved", "Approve", "primary"],
  ["published", "Publish to bank", "primary"],
  ["needs_review", "Send back for review", "secondary"],
  ["approved", "Unpublish", "secondary"],
  ["rejected", "Reject", "danger"]
];

export default async function QuestionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  if (id === "new") {
    return (
      <div className="grid gap-4">
        <AdminHeader title="Write a question" description="Human-written questions are saved as approved; publish them from the next screen." />
        <Flash error={error} />
        <Card><QuestionForm /></Card>
      </div>
    );
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await adminDb();
  const { rows } = await db.query<QuestionRow>("select * from questions where id = $1", [id]);
  const q = rows[0];
  if (!q) notFound();
  const status = q.validation_status;
  const notes = q.validation_notes ?? {};
  const allowed = buttons.filter(([to, label]) => canTransition(status, to) && !(label === "Unpublish" && status !== "published") && !(label === "Approve" && status === "published"));

  return (
    <div className="grid gap-4">
      <AdminHeader title="Review question" />
      <Flash notice={notice} error={error} />
      <Card title="Decision">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
          <StatusPill status={status} />
          <span>Source: {q.source_type}</span>
          {q.generator_model && <span>Generator: {q.generator_model}</span>}
          {q.critic_model && <span>Checked by: {q.critic_model}</span>}
          {q.prompt_version && <span>Prompt: {q.prompt_version}</span>}
        </div>
        <form className="grid gap-3">
          <input type="hidden" name="id" value={id} />
          <Field label="Review note (optional)"><input name="note" className={inputClass} /></Field>
          <div className="flex flex-wrap gap-2">
            {allowed.map(([to, label, variant]) => (
              <button key={label} formAction={setQuestionStatus} name="to" value={to} className={`min-h-11 rounded-full px-5 text-sm font-black ${variant === "primary" ? "bg-[linear-gradient(135deg,#18B943,#0D9488)] text-white shadow-green" : variant === "danger" ? "border border-red-200 bg-red-50 text-error" : "border border-border bg-white text-primary"}`}>
                {label}
              </button>
            ))}
          </div>
        </form>
      </Card>
      {Object.keys(notes).length > 0 && (
        <Card title="Automatic checks">
          <ul className="grid gap-2">
            {summariseChecks(notes).map((line, index) => (
              <li key={index} className="flex gap-3 rounded-xl bg-surface p-3 text-sm">
                <span className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${line.state === "pass" ? "bg-success" : line.state === "fail" ? "bg-error" : line.state === "flag" ? "bg-warning" : "bg-muted"}`} aria-hidden="true">{line.state === "pass" ? "✓" : line.state === "fail" ? "✕" : line.state === "flag" ? "!" : "–"}</span>
                <span><span className="font-black text-primary">{line.label}</span>{line.detail ? <span className="block text-xs font-semibold text-muted">{line.detail}</span> : null}</span>
              </li>
            ))}
          </ul>
          <details className="mt-3"><summary className="cursor-pointer text-xs font-black text-muted">Raw check data</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface p-3 text-xs text-muted">{JSON.stringify(notes, null, 2)}</pre>
          </details>
        </Card>
      )}
      <Card title="Edit">
        <p className="mb-3 text-xs font-semibold text-muted">Editing an approved or published question sends it back to review.</p>
        <QuestionForm lockExam values={{ id, tier: q.tier, subject: q.subject, topic: q.topic, difficulty: q.difficulty, stem: q.stem, options: q.options, correct_option: q.correct_option, explanation: q.explanation, est_time_seconds: q.est_time_seconds }} />
      </Card>
    </div>
  );
}
