import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, ButtonLinkSmall, DataTable, Flash, StatusPill, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { bulkSetQuestionStatus } from "@/app/admin/questions/actions";
import { adminDb } from "@/lib/admin/db";
import { validationStatuses } from "@/lib/tests/question-schema";

export const metadata = { title: "Question review" };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ status?: string; subject?: string; topic?: string; page?: string; notice?: string; error?: string }> }) {
  const { status = "review", subject = "", topic = "", page: pageParam, notice, error } = await searchParams;
  const pageSize = 50;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const db = await adminDb();
  const statusFilter = status === "review" ? ["auto_passed", "needs_review"] : validationStatuses.includes(status as never) ? [status] : validationStatuses.slice();
  const [counts, rows] = await Promise.all([
    db.query<{ validation_status: string; n: string }>("select validation_status, count(*) as n from questions group by 1"),
    db.query<{ id: string; stem: string; subject: string; topic: string; difficulty: string; validation_status: string; generator_model: string | null }>(
      `select id, stem, subject, topic, difficulty, validation_status, generator_model from questions
       where validation_status = any($1) and ($2 = '' or subject ilike $2 || '%') and ($3 = '' or topic ilike $3 || '%')
       order by created_at desc limit ${pageSize + 1} offset ${(page - 1) * pageSize}`,
      [statusFilter, subject.replace(/[%_\\]/g, ""), topic.replace(/[%_\\]/g, "")]
    )
  ]);
  const hasNext = rows.rows.length > pageSize;
  const visible = rows.rows.slice(0, pageSize);
  const pageHref = (target: number) => `/admin/questions?status=${status}&subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}&page=${target}` as Route;
  const countFor = (key: string) => counts.rows.find((row) => row.validation_status === key)?.n ?? "0";
  const back = `/admin/questions?status=${status}`;
  const tabs: Array<[string, string]> = [["review", `Needs review (${Number(countFor("auto_passed")) + Number(countFor("needs_review"))})`], ...validationStatuses.map((s) => [s, `${s.replace("_", " ")} (${countFor(s)})`] as [string, string])];

  return (
    <div className="grid gap-4">
      <AdminHeader title="Question review queue" description="AI output never publishes itself. A person approves each question here, then publishes it to the bank." action={{ href: "/admin/questions/new", label: "Write a question" }} />
      <Flash notice={notice} error={error} />
      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <Link key={key} href={`/admin/questions?status=${key}` as Route} className={`rounded-full px-3 py-1.5 text-xs font-black ${status === key ? "bg-primary text-white" : "bg-white text-primary shadow-soft"}`}>{label}</Link>
        ))}
      </div>
      <form method="get" className="flex flex-wrap gap-3">
        <input type="hidden" name="status" value={status} />
        <input name="subject" defaultValue={subject} placeholder="Subject (starts with)" className={`${inputClass} max-w-48`} />
        <input name="topic" defaultValue={topic} placeholder="Topic (starts with)" className={`${inputClass} max-w-48`} />
        <SubmitButton variant="secondary">Filter</SubmitButton>
      </form>
      <form action={bulkSetQuestionStatus} className="grid gap-3">
        <input type="hidden" name="back" value={back} />
        <DataTable headers={["", "Question", "Subject / topic", "Difficulty", "Source", "Status", ""]} empty="No questions here.">
          {visible.map((q) => (
            <tr key={q.id}>
              <Td><input type="checkbox" name="question_id" value={q.id} className="size-4" aria-label="Select question" /></Td>
              <Td className="max-w-md">{q.stem.length > 140 ? `${q.stem.slice(0, 140)}...` : q.stem}</Td>
              <Td>{q.subject} / {q.topic}</Td>
              <Td>{q.difficulty}</Td>
              <Td className="text-xs">{q.generator_model ?? "human"}</Td>
              <Td><StatusPill status={q.validation_status} /></Td>
              <Td><ButtonLinkSmall href={`/admin/questions/${q.id}`}>Review</ButtonLinkSmall></Td>
            </tr>
          ))}
        </DataTable>
        <div className="flex items-center gap-3 text-sm font-bold text-primary">
          {page > 1 && <Link href={pageHref(page - 1)}>Previous</Link>}
          <span className="text-muted">Page {page}</span>
          {hasNext && <Link href={pageHref(page + 1)}>Next</Link>}
        </div>
        <div className="flex gap-2">
          <SubmitButton name="to" value="approved">Approve selected</SubmitButton>
          <SubmitButton name="to" value="published" variant="secondary">Publish selected</SubmitButton>
          <SubmitButton name="to" value="rejected" variant="danger">Reject selected</SubmitButton>
        </div>
      </form>
    </div>
  );
}
