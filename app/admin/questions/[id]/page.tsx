import { notFound } from "next/navigation";
import { AdminHeader, Card, Field, Flash, StatusPill, SubmitButton, inputClass } from "@/components/admin/ui";
import { QuestionForm } from "@/components/admin/question-form";
import { QuestionFigure } from "@/components/question-figure";
import { Inline, Rich } from "@/components/rich-text";
import { SetStimulus } from "@/components/set-stimulus";
import { SolutionText } from "@/components/solution-text";
import { toQuestionSet } from "@/lib/question-sets";
import { saveQuestionImage, setQuestionStatus } from "@/app/admin/questions/actions";
import { saveTranslation, setSetTranslationStatus, setTranslationStatus } from "@/app/admin/translations/actions";
import { Chart } from "@/components/chart";
import { toFigure } from "@/lib/figure";
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
  set_id: string | null;
  figure: unknown;
  image_id: string | null;
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
  const dataSet = q.set_id
    ? (await db.query<{ id: string; title: string; stimulus: string; chart: unknown; kind: string; n: string }>(
        "select s.id, s.title, s.stimulus, s.chart, s.kind, (select count(*) from questions where set_id = s.id) as n from question_sets s where s.id = $1", [q.set_id])).rows[0]
    : null;
  const figure = toFigure(q.figure);
  const image = q.image_id ? { id: q.image_id, alt: (await db.query<{ alt: string }>("select alt from question_images where id = $1", [q.image_id])).rows[0]?.alt ?? "" } : null;
  const hindi = (await db.query<{ stem: string; options: Record<string, string>; explanation: string; status: string; notes: { reasons?: string[] } }>(
    "select stem, options, explanation, status, notes from question_translations where question_id = $1 and lang = 'hi'", [id])).rows[0];
  const hindiSet = q.set_id
    ? (await db.query<{ title: string; stimulus: string; chart: unknown; status: string; kind: string }>(
        "select t.title, t.stimulus, t.chart, t.status, s.kind from set_translations t join question_sets s on s.id = t.set_id where t.set_id = $1 and t.lang = 'hi'", [q.set_id])).rows[0]
    : null;
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
      <Card title="How a learner sees it">
        {dataSet && (
          <>
            <SetStimulus set={toQuestionSet(dataSet)} />
            <p className="mb-3 text-xs font-semibold text-muted">This question is one of {dataSet.n} that share this {dataSet.kind === "data" ? "data" : "passage"}. Reject the questions of a set together if its {dataSet.kind === "data" ? "data" : "passage"} is wrong.</p>
          </>
        )}
        <QuestionFigure figure={figure} image={image} />
        <Rich text={q.stem} className="text-lg font-bold leading-8 text-foreground" />
        <ul className="mt-3 grid gap-2 text-sm">
          {(["A", "B", "C", "D"] as const).map((key) => (
            <li key={key} className={`rounded-xl px-3 py-2 font-semibold ${key === q.correct_option ? "bg-mint text-success" : "bg-surface text-muted"}`}>{key}) <Inline text={q.options[key] ?? ""} />{key === q.correct_option ? " (correct)" : ""}</li>
          ))}
        </ul>
        <div className="mt-3 rounded-xl bg-surface p-3 text-sm leading-6 text-muted"><p className="mb-1.5 text-xs font-black uppercase tracking-wide text-success">Solution</p><SolutionText text={q.explanation} /></div>
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
      {hindi && (
        <Card title="Hindi version">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted">
            <StatusPill status={hindi.status} />
            <span>Learners see it only when it is approved{q.set_id ? " and the shared data below is approved too" : ""}.</span>
          </div>
          {hindi.notes?.reasons?.length ? <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-error">{hindi.notes.reasons.join(" ")}</p> : null}
          {hindiSet && (
            <div className="mb-4 rounded-2xl border border-border bg-surface p-4" lang="hi">
              <div className="mb-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted" lang="en">
                <StatusPill status={hindiSet.status} /> <span>Hindi version of the shared {hindiSet.kind === "data" ? "data" : "passage"}</span>
              </div>
              <p className="text-sm font-black text-primary">{hindiSet.title}</p>
              {hindiSet.stimulus.trim() && <Rich text={hindiSet.stimulus} className="mt-2 grid gap-2 text-base leading-7 text-foreground" />}
              {toQuestionSet({ id: q.set_id!, title: hindiSet.title, stimulus: hindiSet.stimulus, chart: hindiSet.chart }).chart && <Chart chart={toQuestionSet({ id: q.set_id!, title: hindiSet.title, stimulus: hindiSet.stimulus, chart: hindiSet.chart }).chart!} />}
              {hindiSet.status === "needs_review" && (
                <form action={setSetTranslationStatus} className="mt-3 flex flex-wrap gap-2" lang="en">
                  <input type="hidden" name="set_id" value={q.set_id!} />
                  <input type="hidden" name="question_id" value={id} />
                  <SubmitButton name="to" value="approved">Approve the shared data</SubmitButton>
                  <SubmitButton name="to" value="rejected" variant="danger">Reject</SubmitButton>
                </form>
              )}
            </div>
          )}
          <div lang="hi">
            <Rich text={hindi.stem} className="text-lg font-bold leading-8 text-foreground" />
            <ul className="mt-3 grid gap-2 text-sm">
              {(["A", "B", "C", "D"] as const).map((key) => (
                <li key={key} className={`rounded-xl px-3 py-2 font-semibold ${key === q.correct_option ? "bg-mint text-success" : "bg-surface text-muted"}`}>{key}) <Inline text={hindi.options[key] ?? ""} />{key === q.correct_option ? " (correct)" : ""}</li>
              ))}
            </ul>
            <div className="mt-3 rounded-xl bg-surface p-3 text-sm leading-6 text-muted"><SolutionText text={hindi.explanation} /></div>
          </div>
          <form action={setTranslationStatus} className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="question_id" value={id} />
            {hindi.status === "needs_review" && <SubmitButton name="to" value="approved">Approve Hindi version</SubmitButton>}
            {hindi.status === "approved" && <SubmitButton name="to" value="needs_review" variant="secondary">Send back for review</SubmitButton>}
            {["needs_review", "approved", "failed"].includes(hindi.status) && <SubmitButton name="to" value="rejected" variant="danger">Reject</SubmitButton>}
          </form>
          {["needs_review", "approved", "rejected", "failed"].includes(hindi.status) && hindi.stem && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-black text-primary">Edit the Hindi</summary>
              <form action={saveTranslation} className="mt-3 grid gap-3 md:grid-cols-2">
                <input type="hidden" name="question_id" value={id} />
                <div className="md:col-span-2"><Field label="Question"><textarea name="stem" rows={5} defaultValue={hindi.stem} lang="hi" className={inputClass} /></Field></div>
                {["A", "B", "C", "D"].map((key) => <Field key={key} label={`Option ${key}`}><input name={`option_${key}`} defaultValue={hindi.options[key]} lang="hi" className={inputClass} /></Field>)}
                <div className="md:col-span-2"><Field label="Solution" hint="Keep one line for each English line, the same numbers, and the उत्तर line naming the same option."><textarea name="explanation" rows={8} defaultValue={hindi.explanation} lang="hi" className={inputClass} /></Field></div>
                <div className="md:col-span-2"><SubmitButton variant="secondary">Save Hindi (goes back to review)</SubmitButton></div>
              </form>
            </details>
          )}
        </Card>
      )}
      <Card title="Figure or picture">
        {figure && <p className="mb-3 rounded-xl bg-surface px-4 py-3 text-xs font-semibold text-muted">This question has a figure drawn from the AI&apos;s description (shown above, not to scale). To change it, reject the question and write a new one.</p>}
        <p className="mb-3 text-xs font-semibold text-muted">For a diagram that cannot be drawn from a description, upload a picture (PNG, JPG or WebP, up to 700 KB). The description is read by screen readers and given to the checking AI, so write what a person would need to know to solve it. A new picture sends the question back to review.</p>
        <form action={saveQuestionImage} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <Field label={image ? "Replace the picture" : "Picture"}><input name="image" type="file" accept="image/png,image/jpeg,image/webp" className={inputClass} /></Field>
          <Field label="What the picture shows"><textarea name="alt" rows={3} defaultValue={image?.alt ?? ""} className={inputClass} /></Field>
          {image && <label className="flex items-center gap-2 text-sm font-bold text-primary"><input type="checkbox" name="remove" className="size-4" /> Remove picture</label>}
          <div className="md:col-span-2"><SubmitButton variant="secondary">Save picture</SubmitButton></div>
        </form>
      </Card>
      <Card title="Edit">
        <p className="mb-3 text-xs font-semibold text-muted">Editing an approved or published question sends it back to review.</p>
        <QuestionForm lockExam values={{ id, tier: q.tier, subject: q.subject, topic: q.topic, difficulty: q.difficulty, stem: q.stem, options: q.options, correct_option: q.correct_option, explanation: q.explanation, est_time_seconds: q.est_time_seconds }} />
      </Card>
    </div>
  );
}
