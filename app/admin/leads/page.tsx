import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, ButtonLinkSmall, DataTable, Flash, StatusPill, Td } from "@/components/admin/ui";
import { adminDb } from "@/lib/admin/db";
import { missingFields } from "@/lib/ingest/fields";
import { leadCounts, leadStatuses, listLeads, todayInIndia, type LeadStatus } from "@/lib/ingest/leads";
import { leadTypeLabels } from "@/lib/ingest/parse";

export const metadata = { title: "Competitor leads" };

const filters: Array<LeadStatus | "all"> = ["pending", "published", "drafted", "rejected", "duplicate", "all"];

export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; notice?: string; error?: string }> }) {
  const { status: requested = "pending", notice, error } = await searchParams;
  const status = (filters as string[]).includes(requested) ? (requested as LeadStatus | "all") : "pending";
  const db = await adminDb();
  const [leads, counts] = await Promise.all([listLeads(db, status), leadCounts(db)]);
  const today = todayInIndia();

  return (
    <div className="grid gap-4">
      <AdminHeader
        title="Competitor leads"
        description="Notifications spotted on other sites by the collector extension, with duplicates from different sites joined into one. Nothing here is public. Check each one against the official notification, then approve it to go live."
        action={{ href: "/admin/leads/extension", label: "Connect the extension" }}
      />
      <Flash notice={notice} error={error} />
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link key={filter} href={`/admin/leads?status=${filter}` as Route} className={`rounded-full px-3 py-1.5 text-xs font-black ${status === filter ? "bg-primary text-white" : "bg-white text-primary shadow-soft"}`}>
            {filter} ({counts[filter]})
          </Link>
        ))}
      </div>
      <DataTable headers={["Notification", "Organisation", "Last date", "Seen on", "Still missing", "Spotted", ""]} empty={status === "pending" ? "Nothing waiting. Open a notification on another site and click Analyse in the extension." : "No leads here."}>
        {leads.map((lead) => {
          const missing = lead.detail_captured ? missingFields({ organisationId: null, organisationName: lead.organisation, applicationEndDate: lead.application_end_date, officialNotificationUrl: lead.official_notification_url, officialApplicationUrl: lead.official_application_url, posts: lead.posts }) : [];
          return (
            <tr key={lead.id}>
              <Td>
                <p className="font-black text-primary">{lead.title}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {lead.lead_type !== "recruitment" && <span className="rounded-full bg-surface px-2 py-0.5 text-[0.68rem] font-black text-muted">{leadTypeLabels[lead.lead_type]}</span>}
                  {!lead.detail_captured && <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[0.68rem] font-black text-warning">Headline only</span>}
                  {lead.application_end_date && lead.application_end_date < today && lead.status === "pending" && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.68rem] font-black text-error">Last date passed</span>}
                  {lead.matched_recruitment_id && <span className="rounded-full bg-cyan-soft px-2 py-0.5 text-[0.68rem] font-black text-teal">May already be live</span>}
                </div>
              </Td>
              <Td>{lead.organisation ?? "-"}</Td>
              <Td className="whitespace-nowrap">{lead.application_end_date ?? "-"}</Td>
              <Td className="text-xs">{lead.source_count > 1 && <span className="mr-1 rounded-full bg-mint px-2 py-0.5 font-black text-success">{lead.source_count} sites</span>}{lead.sites}</Td>
              <Td className="text-xs">{!lead.detail_captured ? "Open its page and click Analyse" : missing.length ? missing.join(", ") : <span className="font-black text-success">Ready to check</span>}</Td>
              <Td className="whitespace-nowrap text-xs">{new Date(lead.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Td>
              <Td>{status === "all" ? <StatusPill status={lead.status} /> : <ButtonLinkSmall href={`/admin/leads/${lead.id}`}>Review</ButtonLinkSmall>}{status === "all" && <div className="mt-1"><ButtonLinkSmall href={`/admin/leads/${lead.id}`}>Open</ButtonLinkSmall></div>}</Td>
            </tr>
          );
        })}
      </DataTable>
      <p className="text-xs font-semibold text-muted">Statuses: {leadStatuses.join(", ")}. A rejected or published lead is not reopened when another site carries the same notification.</p>
    </div>
  );
}
