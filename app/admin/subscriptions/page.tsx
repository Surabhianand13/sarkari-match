import { AdminHeader, Card, DataTable, Field, Flash, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { grantAccess, grantGuideAccess } from "@/app/admin/subscriptions/actions";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Subscriptions and access" };

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const [guides, access, users, seriesList, examList] = await Promise.all([
    db.query<{ id: string; email: string; exam: string; source: string; expires_at: string | null; created_at: string }>(
      "select g.id, u.email, e.name as exam, g.source, g.expires_at::text, g.created_at::text from guide_access g join users u on u.id = g.user_id join exams e on e.id = g.exam_id order by g.created_at desc limit 100"
    ),
    db.query<{ id: string; email: string; series: string; source: string; expires_at: string | null; created_at: string }>(
      "select a.id, u.email, s.title as series, a.source, a.expires_at::text, a.created_at::text from test_access a join users u on u.id = a.user_id join test_series s on s.id = a.series_id order by a.created_at desc limit 100"
    ),
    db.query<{ n: string; last_week: string }>("select count(*) as n, count(*) filter (where created_at > now() - interval '7 days') as last_week from users"),
    db.query<{ id: string; title: string }>("select id, title from test_series order by title"),
    db.query<{ id: string; name: string }>("select id, name from exams order by name")
  ]);
  return (
    <div className="grid gap-4">
      <AdminHeader title="Paid learners" description="Who holds an Exam Pass or an AI Study Guide, and manual grants." />
      <Flash notice={notice} error={error} />
      <Card title="Grant an Exam Pass">
        <form action={grantAccess} className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_1fr_auto] md:items-end">
          <Field label="Learner email"><input name="email" type="email" required className={inputClass} /></Field>
          <Field label="Series">
            <select name="series_id" required className={inputClass}>{seriesList.rows.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
          </Field>
          <Field label="Ends (optional)"><input name="expires_at" type="date" className={inputClass} /></Field>
          <SubmitButton>Grant</SubmitButton>
        </form>
        <p className="mt-2 text-xs font-semibold text-muted">Leave the end date empty to use the exam&apos;s own validity (12 months by default). Use this for manual sales, offline payments or support. Paid access is granted automatically by the payment page through the access API.</p>
      </Card>
      <Card title="Grant an AI Study Guide">
        <form action={grantGuideAccess} className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_1fr_auto] md:items-end">
          <Field label="Learner email"><input name="email" type="email" required className={inputClass} /></Field>
          <Field label="Exam">
            <select name="exam_id" required className={inputClass}>{examList.rows.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </Field>
          <Field label="Ends (optional)"><input name="expires_at" type="date" className={inputClass} /></Field>
          <SubmitButton>Grant</SubmitButton>
        </form>
        <p className="mt-2 text-xs font-semibold text-muted">The Guide is sold only to learners with that exam&apos;s Pass. A manual grant here does not check that, so use it for support and offers.</p>
      </Card>
      <Card><p className="text-sm font-black text-primary">{users.rows[0].n} registered users, {users.rows[0].last_week} joined in the last 7 days.</p></Card>
      <Card title="AI Study Guide access">
        <DataTable headers={["User", "Exam", "Source", "Ends", "Granted"]} empty="No AI Study Guides yet.">
          {guides.rows.map((row) => (
            <tr key={row.id}><Td>{row.email}</Td><Td>{row.exam}</Td><Td>{row.source}</Td><Td className="text-xs">{row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-IN") : "No end"}</Td><Td className="text-xs">{new Date(row.created_at).toLocaleDateString("en-IN")}</Td></tr>
          ))}
        </DataTable>
      </Card>
      <Card title="Exam Pass access">
        <DataTable headers={["User", "Series", "Source", "Ends", "Granted"]} empty="No test access granted yet.">
          {access.rows.map((row) => (
            <tr key={row.id}><Td>{row.email}</Td><Td>{row.series}</Td><Td>{row.source}</Td><Td className="text-xs">{row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-IN") : "No end"}</Td><Td className="text-xs">{new Date(row.created_at).toLocaleDateString("en-IN")}</Td></tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
