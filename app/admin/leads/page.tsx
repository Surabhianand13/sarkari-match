import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, ButtonLinkSmall, DataTable, Field, Flash, StatusPill, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { SelectReady } from "@/components/admin/select-ready";
import { bulkPublishLeads } from "@/app/admin/leads/actions";
import { adminDb } from "@/lib/admin/db";
import { missingFields } from "@/lib/ingest/fields";
import { todayInIndia } from "@/lib/data/status";
import { leadCounts, leadStatuses, listLeads, type LeadStatus } from "@/lib/ingest/leads";
import { leadTypeLabels } from "@/lib/ingest/parse";

export const metadata = { title: "Competitor leads" };

const filters: Array<LeadStatus | "all" | "updated"> = ["pending", "updated", "published", "drafted", "rejected", "duplicate", "all"];

export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; notice?: string; error?: string }> }) {
  const { status: requested = "pending", notice, error } = await searchParams;
  const status = (filters as string[]).includes(requested) ? (requested as LeadStatus | "all" | "updated") : "pending";
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
            {filter === "updated" ? "changed on source" : filter} ({counts[filter]})
          </Link>
        ))}
      </div>
      <form id="bulk-publish" action={bulkPublishLeads} className="grid gap-4">
      {status === "pending" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
          <p className="text-xs font-semibold text-muted">Leads marked Ready have every detail the site needs. Tick the ones you want, then publish them together below.</p>
          <SelectReady formId="bulk-publish" />
        </div>
      )}
      <DataTable headers={[...(status === "pending" ? [""] : []), "Notification", "Organisation", "Last date", "Seen on", "Still missing", "Spotted", ""]} empty={status === "pending" ? "Nothing waiting. Open a notification on another site and click Analyse in the extension." : "No leads here."}>
        {leads.map((lead) => {
          const missing = lead.detail_captured ? missingFields({ organisationId: null, organisationName: lead.organisation, applicationEndDate: lead.application_end_date, officialNotificationUrl: lead.official_notification_url, officialApplicationUrl: lead.official_application_url, posts: lead.posts }) : [];
          const ready = lead.status === "pending" && lead.detail_captured && lead.lead_type === "recruitment" && missing.length === 0;
          return (
            <tr key={lead.id}>
              {status === "pending" && <Td>{ready && <input type="checkbox" name="ids" value={lead.id} aria-label={`Select ${lead.title}`} className="size-4" />}</Td>}
              <Td>
                <p className="font-black text-primary">{lead.title}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {lead.lead_type !== "recruitment" && <span className="rounded-full bg-surface px-2 py-0.5 text-[0.68rem] font-black text-muted">{leadTypeLabels[lead.lead_type]}</span>}
                  {!lead.detail_captured && <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[0.68rem] font-black text-warning">Headline only</span>}
                  {lead.application_end_date && lead.application_end_date < today && lead.status === "pending" && <span className="rounded-full bg-surface px-2 py-0.5 text-[0.68rem] font-black text-muted">Past: will show as closed</span>}
                  {lead.matched_recruitment_id && <span className="rounded-full bg-cyan-soft px-2 py-0.5 text-[0.68rem] font-black text-teal">May already be live</span>}
                  {lead.updated_unseen && <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[0.68rem] font-black text-warning">Changed on the source</span>}
                </div>
              </Td>
              <Td>{lead.organisation ?? "-"}</Td>
              <Td className="whitespace-nowrap">{lead.application_end_date ?? "-"}</Td>
              <Td className="text-xs">{lead.source_count > 1 && <span className="mr-1 rounded-full bg-mint px-2 py-0.5 font-black text-success">{lead.source_count} sites</span>}{lead.sites}</Td>
              <Td className="text-xs">{!lead.detail_captured ? "Open its page and click Analyse" : missing.length ? missing.join(", ") : <span className="font-black text-success">Ready to check</span>}</Td>
              <Td className="whitespace-nowrap text-xs">{new Date(lead.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Td>
              <Td>{status === "all" || status === "updated" ? <StatusPill status={lead.status} /> : <ButtonLinkSmall href={`/admin/leads/${lead.id}`}>Review</ButtonLinkSmall>}{(status === "all" || status === "updated") && <div className="mt-1"><ButtonLinkSmall href={`/admin/leads/${lead.id}`}>Open</ButtonLinkSmall></div>}</Td>
            </tr>
          );
        })}
      </DataTable>
      {status === "pending" && (
        <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-soft md:grid-cols-[1fr_auto] md:items-end">
          <Field label="What you checked" hint="Kept in the audit trail for every lead published here. One that is missing something is skipped and listed.">
            <input name="note" className={inputClass} placeholder="Archive batch checked against the organisations' own sites" />
          </Field>
          <SubmitButton>Publish ticked leads</SubmitButton>
          <label className="flex items-start gap-2 text-sm font-black text-primary md:col-span-2"><input type="checkbox" name="verified" className="mt-1 size-4" /> I checked these against their official notifications.</label>
        </div>
      )}
      </form>
      <p className="text-xs font-semibold text-muted">Statuses: {leadStatuses.join(", ")}. A rejected or published lead is not reopened when another site carries the same notification.</p>
    </div>
  );
}
