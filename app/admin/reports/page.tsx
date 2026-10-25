import { AdminHeader, Card, DataTable, Flash, StatusPill, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { resolveReport } from "@/app/admin/reports/actions";
import { adminDb } from "@/lib/admin/db";
import { getAdminStats } from "@/lib/admin/stats";

export const metadata = { title: "Reports" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const db = await adminDb();
  const [stats, reports] = await Promise.all([
    getAdminStats(),
    db.query<{ id: string; issue_type: string; details: string; status: string; admin_notes: string | null; created_at: string; post_title: string | null; slug: string | null }>(
      `select r.id, r.issue_type, r.details, r.status, r.admin_notes, r.created_at::text, jp.title as post_title, jp.slug
       from reports r left join job_posts jp on jp.id = r.post_id order by (r.status = 'open') desc, r.created_at desc limit 100`
    )
  ]);
  return (
    <div className="grid gap-4">
      <AdminHeader title="Reports" description="Errors candidates reported on notification pages, plus headline numbers." />
      <Flash notice={notice} />
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Published notifications", stats?.publishedNotifications], ["Closing in 7 days", stats?.closingSoon], ["Open error reports", stats?.reportsOpen]].map(([label, value]) => (
          <Card key={label as string}><p className="text-xs font-black uppercase tracking-wide text-muted">{label}</p><p className="mt-2 text-3xl font-black text-primary">{value ?? "-"}</p></Card>
        ))}
      </div>
      <DataTable headers={["Reported", "Notification", "Issue", "Details", "Status", "Action"]} empty="No error reports.">
        {reports.rows.map((report) => (
          <tr key={report.id}>
            <Td className="whitespace-nowrap text-xs">{new Date(report.created_at).toLocaleDateString("en-IN")}</Td>
            <Td>{report.post_title ?? "-"}</Td>
            <Td>{report.issue_type}</Td>
            <Td className="max-w-sm">{report.details}</Td>
            <Td><StatusPill status={report.status === "open" ? "needs_review" : "approved"} /></Td>
            <Td>
              <form action={resolveReport} className="grid gap-2">
                <input type="hidden" name="id" value={report.id} />
                <input type="hidden" name="status" value={report.status === "open" ? "resolved" : "open"} />
                <input name="notes" defaultValue={report.admin_notes ?? ""} placeholder="Note" className={inputClass} />
                <SubmitButton variant="secondary">{report.status === "open" ? "Mark resolved" : "Reopen"}</SubmitButton>
              </form>
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
