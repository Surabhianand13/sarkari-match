import { AdminHeader, Card, DataTable, StatusPill, Td } from "@/components/admin/ui";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Subscriptions and access" };

export default async function AdminSubscriptionsPage() {
  const db = await adminDb();
  const [entitlements, access, users] = await Promise.all([
    db.query<{ id: string; email: string; plan_code: string; starts_at: string; ends_at: string | null; source: string }>(
      "select e.id, u.email, e.plan_code, e.starts_at::text, e.ends_at::text, e.source from entitlements e join users u on u.id = e.user_id where e.active order by e.starts_at desc limit 100"
    ),
    db.query<{ id: string; email: string; series: string; source: string; expires_at: string | null; created_at: string }>(
      "select a.id, u.email, s.title as series, a.source, a.expires_at::text, a.created_at::text from test_access a join users u on u.id = a.user_id join test_series s on s.id = a.series_id order by a.created_at desc limit 100"
    ),
    db.query<{ n: string; last_week: string }>("select count(*) as n, count(*) filter (where created_at > now() - interval '7 days') as last_week from users")
  ]);
  return (
    <div className="grid gap-4">
      <AdminHeader title="Subscriptions and access" description="Who has Pro access and who can open which test series." />
      <Card><p className="text-sm font-black text-primary">{users.rows[0].n} registered users, {users.rows[0].last_week} joined in the last 7 days.</p></Card>
      <Card title="Pro entitlements">
        <DataTable headers={["User", "Plan", "Starts", "Ends", "Source"]} empty="No active entitlements.">
          {entitlements.rows.map((row) => (
            <tr key={row.id}><Td>{row.email}</Td><Td><StatusPill status="published" /> {row.plan_code}</Td><Td className="text-xs">{new Date(row.starts_at).toLocaleDateString("en-IN")}</Td><Td className="text-xs">{row.ends_at ? new Date(row.ends_at).toLocaleDateString("en-IN") : "No end"}</Td><Td>{row.source}</Td></tr>
          ))}
        </DataTable>
      </Card>
      <Card title="Test series access">
        <DataTable headers={["User", "Series", "Source", "Expires", "Granted"]} empty="No test access granted yet.">
          {access.rows.map((row) => (
            <tr key={row.id}><Td>{row.email}</Td><Td>{row.series}</Td><Td>{row.source}</Td><Td className="text-xs">{row.expires_at ? new Date(row.expires_at).toLocaleDateString("en-IN") : "Lifetime"}</Td><Td className="text-xs">{new Date(row.created_at).toLocaleDateString("en-IN")}</Td></tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
