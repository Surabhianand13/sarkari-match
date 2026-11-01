import { headers } from "next/headers";
import { AdminHeader, Card, DataTable, Flash, Td } from "@/components/admin/ui";
import { TokenForm } from "@/components/admin/token-form";
import { revokeToken } from "@/app/admin/leads/actions";
import { adminDb } from "@/lib/admin/db";
import { listIngestTokens } from "@/lib/ingest/tokens";

export const metadata = { title: "Collector extension" };

export default async function CollectorExtensionPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const tokens = await listIngestTokens(db);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return (
    <div className="grid gap-4">
      <AdminHeader title="Collector extension" description="A Chrome extension that reads the notification page you have open and sends it here as a lead. It cannot publish anything: a token only adds leads for you to review." />
      <Flash notice={notice} error={error} />
      <Card title="1. Install the extension">
        <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-muted">
          <li>In Chrome, open <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-bold text-primary">chrome://extensions</code> and switch on Developer mode.</li>
          <li>Click <b className="text-primary">Load unpacked</b> and choose the <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-bold text-primary">extension</code> folder of the SarkariMatch project.</li>
          <li>Pin <b className="text-primary">SarkariMatch Collector</b> to the toolbar, then open its settings.</li>
        </ol>
      </Card>
      <Card title="2. Make a token">
        <p className="mb-3 text-sm text-muted">Paste the token and this server address into the extension settings: <code className="rounded bg-surface px-1.5 py-0.5 text-xs font-bold text-primary">{protocol}://{host}</code></p>
        <TokenForm />
      </Card>
      <Card title="3. Collect">
        <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted">
          <li>On a competitor&apos;s notification page, click the extension and press <b className="text-primary">Analyse this page</b>. The details, links and post table are sent here.</li>
          <li>On a listing page, press <b className="text-primary">Collect headlines</b> to add every new notification title as a lead; analyse each one later to fill in its details.</li>
          <li>The same notification from two sites becomes one lead, with both sources and any disagreement shown.</li>
        </ul>
      </Card>
      <Card title="Tokens">
        <DataTable headers={["Name", "Made by", "Created", "Last used", ""]} empty="No tokens yet.">
          {tokens.map((token) => (
            <tr key={token.id}>
              <Td className="font-black text-primary">{token.label}{token.revoked_at && <span className="ml-2 text-xs font-bold text-error">revoked</span>}</Td>
              <Td className="text-xs">{token.created_by_email ?? "-"}</Td>
              <Td className="whitespace-nowrap text-xs">{new Date(token.created_at).toLocaleDateString("en-IN")}</Td>
              <Td className="whitespace-nowrap text-xs">{token.last_used_at ? new Date(token.last_used_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never"}</Td>
              <Td>
                {!token.revoked_at && (
                  <form action={revokeToken}>
                    <input type="hidden" name="id" value={token.id} />
                    <button className="font-black text-error underline">Revoke</button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
