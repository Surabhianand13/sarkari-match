import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, ButtonLinkSmall, DataTable, Flash, StatusPill, SubmitButton, Td } from "@/components/admin/ui";
import { bulkTranslationStatus } from "@/app/admin/translations/actions";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Hindi translations" };

const statuses = ["needs_review", "approved", "pending", "checking", "failed", "rejected"] as const;
const snippet = (value: string, length = 110) => (value.length > length ? `${value.slice(0, length)}...` : value);

export default async function TranslationsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; notice?: string; error?: string }> }) {
  const { status: statusParam = "needs_review", page: pageParam, notice, error } = await searchParams;
  const status = (statuses as readonly string[]).includes(statusParam) ? statusParam : "needs_review";
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = 50;
  const db = await adminDb();
  const [counts, questions, sets] = await Promise.all([
    db.query<{ status: string; n: number }>("select status, count(*)::int as n from question_translations where lang = 'hi' group by status"),
    db.query<{ question_id: string; subject: string; topic: string; en: string; hi: string; status: string; reasons: string | null }>(
      `select t.question_id, q.subject, q.topic, q.stem as en, t.stem as hi, t.status, t.notes->'reasons'->>0 as reasons
         from question_translations t join questions q on q.id = t.question_id
        where t.lang = 'hi' and t.status = $1 order by t.updated_at desc limit ${pageSize + 1} offset ${(page - 1) * pageSize}`, [status]),
    db.query<{ set_id: string; subject: string; en: string; hi: string; status: string }>(
      `select t.set_id, s.subject, s.title as en, t.title as hi, t.status from set_translations t join question_sets s on s.id = t.set_id
        where t.lang = 'hi' and t.status = $1 order by t.updated_at desc limit 100`, [status])
  ]);
  const hasNext = questions.rows.length > pageSize;
  const visible = questions.rows.slice(0, pageSize);
  const countFor = (key: string) => counts.rows.find((row) => row.status === key)?.n ?? 0;
  const back = `/admin/translations?status=${status}`;
  const reviewable = status === "needs_review";

  return (
    <div className="grid gap-4">
      <AdminHeader title="Hindi translations" description="Hindi versions written by the factory. Learners see a Hindi version only after a person who reads Hindi approves it. Open a translation to read it beside the English, edit it, and approve it. Start translation runs from the Question factory page." action={{ href: "/admin/factory", label: "Question factory" }} />
      <Flash notice={notice} error={error} />
      <nav className="flex flex-wrap gap-2" aria-label="Translation status">
        {statuses.map((item) => (
          <Link key={item} href={`/admin/translations?status=${item}` as Route} className={`rounded-full px-4 py-2 text-sm font-black ${status === item ? "bg-primary text-white" : "bg-white text-primary shadow-soft"}`}>
            {item.replace("_", " ")} ({countFor(item)})
          </Link>
        ))}
      </nav>

      <form action={bulkTranslationStatus} className="grid gap-3">
        <input type="hidden" name="back" value={back} />
        {sets.rows.length > 0 && (
          <DataTable headers={["", "Shared data or passage", "Hindi title", "Subject", "Status", ""]} empty="">
            {sets.rows.map((row) => (
              <tr key={row.set_id}>
                <Td>{reviewable && <input type="checkbox" name="set_id" value={row.set_id} className="size-4" aria-label="Select translation" />}</Td>
                <Td>{row.en}</Td>
                <Td><span lang="hi">{row.hi || "-"}</span></Td>
                <Td>{row.subject}</Td>
                <Td><StatusPill status={row.status} /></Td>
                <Td className="text-xs text-muted">Reviewed with its questions</Td>
              </tr>
            ))}
          </DataTable>
        )}
        <DataTable headers={["", "English", "Hindi", "Subject / topic", "Status", ""]} empty="No translations here.">
          {visible.map((row) => (
            <tr key={row.question_id}>
              <Td>{reviewable && <input type="checkbox" name="question_id" value={row.question_id} className="size-4" aria-label="Select translation" />}</Td>
              <Td className="max-w-xs">{snippet(row.en)}</Td>
              <Td className="max-w-xs">{row.hi ? <span lang="hi">{snippet(row.hi)}</span> : <span className="text-muted">{row.reasons ?? "Not written yet"}</span>}</Td>
              <Td>{row.subject} / {row.topic}</Td>
              <Td><StatusPill status={row.status} /></Td>
              <Td><ButtonLinkSmall href={`/admin/questions/${row.question_id}`}>Read and edit</ButtonLinkSmall></Td>
            </tr>
          ))}
        </DataTable>
        {reviewable && (
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton name="to" value="approved">Approve selected</SubmitButton>
            <SubmitButton name="to" value="rejected" variant="danger">Reject selected</SubmitButton>
            <span className="text-xs font-semibold text-muted">Approve only what you have read. A rejected translation can be written again by a new translation run.</span>
          </div>
        )}
      </form>
      <div className="flex justify-between text-sm font-black">
        {page > 1 ? <Link href={`/admin/translations?status=${status}&page=${page - 1}` as Route} className="text-primary underline">Previous</Link> : <span />}
        {hasNext && <Link href={`/admin/translations?status=${status}&page=${page + 1}` as Route} className="text-primary underline">Next</Link>}
      </div>
    </div>
  );
}
