import { AdminHeader, DataTable, Td } from "@/components/admin/ui";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Audit log" };

export default async function AdminAuditLogPage() {
  const db = await adminDb();
  const { rows } = await db.query<{ id: string; action: string; entity_type: string; entity_id: string | null; created_at: string; actor_email: string | null; before_state: unknown; after_state: unknown }>(
    `select a.id, a.action, a.entity_type, a.entity_id, a.created_at::text, u.email as actor_email, a.before_state, a.after_state
     from audit_logs a left join users u on u.id = a.actor_id order by a.created_at desc limit 200`
  );
  return (
    <div className="grid gap-4">
      <AdminHeader title="Audit log" description="Every publishing, review and settings change, by who and when. Showing the latest 200." />
      <DataTable headers={["When", "Who", "Action", "Entity", "Details"]} empty="Nothing recorded yet.">
        {rows.map((row) => (
          <tr key={row.id}>
            <Td className="whitespace-nowrap text-xs">{new Date(row.created_at).toLocaleString("en-IN")}</Td>
            <Td>{row.actor_email ?? "system"}</Td>
            <Td className="font-black text-primary">{row.action}</Td>
            <Td className="text-xs">{row.entity_type}<br />{row.entity_id?.slice(0, 8)}</Td>
            <Td>
              {(row.before_state || row.after_state) ? (
                <details className="text-xs">
                  <summary className="cursor-pointer font-black text-primary">View</summary>
                  <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface p-2 text-muted">{JSON.stringify({ before: row.before_state, after: row.after_state }, null, 2)}</pre>
                </details>
              ) : "-"}
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
