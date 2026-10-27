import { AdminHeader, DataTable, Td } from "@/components/admin/ui";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Waitlist" };

export default async function AdminWaitlistPage() {
  const db = await adminDb();
  const [count, rows] = await Promise.all([
    db.query<{ n: string }>("select count(*) as n from waitlist"),
    db.query<{ id: string; email: string; exam: string; source: string | null; created_at: string }>("select id, email, exam, source, created_at::text from waitlist order by created_at desc limit 500")
  ]);
  return (
    <div>
      <AdminHeader title="Waitlist" description={`${count.rows[0].n} people asked to be told when a test series launches. Newest 500 shown.`} />
      <DataTable headers={["Email", "Exam", "From", "Joined"]} empty="Nobody yet.">
        {rows.rows.map((row) => <tr key={row.id}><Td>{row.email}</Td><Td>{row.exam}</Td><Td className="text-xs">{row.source ?? "-"}</Td><Td className="text-xs">{new Date(row.created_at).toLocaleString("en-IN")}</Td></tr>)}
      </DataTable>
    </div>
  );
}
