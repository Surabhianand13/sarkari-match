import { AdminHeader, Card, DataTable, StatusPill, Td } from "@/components/admin/ui";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  const db = await adminDb();
  const [orders, events, access] = await Promise.all([
    db.query<{ id: string; email: string; plan_code: string; amount_paise: number; status: string; provider_order_id: string | null; created_at: string }>(
      "select o.id, u.email, o.plan_code, o.amount_paise, o.status, o.provider_order_id, o.created_at::text from payment_orders o join users u on u.id = o.user_id order by o.created_at desc limit 100"
    ),
    db.query<{ id: string; provider: string; event_type: string; processed_at: string | null; created_at: string }>("select id, provider, event_type, processed_at::text, created_at::text from payment_events order by created_at desc limit 30"),
    db.query<{ n: string }>("select count(*) as n from test_access where source = 'purchase'")
  ]);
  return (
    <div className="grid gap-4">
      <AdminHeader title="Payments" description="Read-only view of orders and webhook events. Payments are connected separately; test purchases appear here once the integration records them." />
      <Card><p className="text-sm font-black text-primary">Test series purchases recorded: {access.rows[0].n}</p></Card>
      <DataTable headers={["When", "User", "Plan or series", "Amount", "Status", "Provider order"]} empty="No orders yet.">
        {orders.rows.map((order) => (
          <tr key={order.id}>
            <Td className="whitespace-nowrap text-xs">{new Date(order.created_at).toLocaleString("en-IN")}</Td>
            <Td>{order.email}</Td>
            <Td>{order.plan_code}</Td>
            <Td>₹{order.amount_paise / 100}</Td>
            <Td><StatusPill status={order.status === "paid" ? "published" : order.status} /></Td>
            <Td className="text-xs">{order.provider_order_id ?? "-"}</Td>
          </tr>
        ))}
      </DataTable>
      <Card title="Recent webhook events">
        <DataTable headers={["When", "Provider", "Event", "Processed"]} empty="No events yet.">
          {events.rows.map((event) => (
            <tr key={event.id}>
              <Td className="whitespace-nowrap text-xs">{new Date(event.created_at).toLocaleString("en-IN")}</Td>
              <Td>{event.provider}</Td>
              <Td>{event.event_type}</Td>
              <Td>{event.processed_at ? "Yes" : "Pending"}</Td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
