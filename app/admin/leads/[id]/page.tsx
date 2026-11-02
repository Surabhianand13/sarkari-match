import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { AdminHeader, ButtonLinkSmall, Card, Field, Flash, StatusPill, SubmitButton, inputClass } from "@/components/admin/ui";
import { reviewLead } from "@/app/admin/leads/actions";
import { uuidPattern } from "@/lib/admin/api";
import { adminDb } from "@/lib/admin/db";
import { listOrganisationOptions, listStates } from "@/lib/admin/lookups";
import { formatPostLines } from "@/lib/ingest/fields";
import { fieldsOf, getLead } from "@/lib/ingest/leads";
import { findConflicts, leadTypeLabels, tidyTitle } from "@/lib/ingest/parse";

export const metadata = { title: "Review lead" };

export default async function ReviewLeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { id } = await params;
  const { notice, error } = await searchParams;
  if (!uuidPattern.test(id)) notFound();
  const db = await adminDb();
  const found = await getLead(db, id);
  if (!found) notFound();
  const { lead, sources, matched } = found;
  const fields = fieldsOf(lead);
  const pending = lead.status === "pending";
  const conflicts = findConflicts(sources.map((source) => ({ site: source.site, parsed: source.parsed })));

  // Every link found on the sources, official ones first, offered as suggestions in the link boxes.
  const linkChoices = [...new Map(sources.flatMap((source) => source.links).sort((a, b) => Number(b.official) - Number(a.official)).map((link) => [link.href, link])).values()];

  return (
    <div className="grid gap-4">
      <AdminHeader title={lead.title} description={`${leadTypeLabels[lead.lead_type]} spotted on ${sources.length} ${sources.length === 1 ? "site" : "sites"}. Check every field against the official notification before approving.`} />
      <Flash notice={notice} error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={lead.status} />
        <ButtonLinkSmall href="/admin/leads">Back to all leads</ButtonLinkSmall>
        {lead.recruitment_id && <ButtonLinkSmall href={`/admin/recruitments/${lead.recruitment_id}`}>Open the recruitment</ButtonLinkSmall>}
      </div>
      {lead.review_notes && !pending && <Card title="Reviewer note"><p className="whitespace-pre-line text-sm text-muted">{lead.review_notes}</p></Card>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-4">
          {matched && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-soft px-4 py-3 text-sm font-bold text-warning">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>This may already be on SarkariMatch: <Link href={`/admin/recruitments/${matched.id}` as Route} className="underline">{matched.title}</Link> ({matched.editorial_status}). If it is the same notification, mark this lead as a duplicate.</span>
            </p>
          )}
          {!lead.detail_captured && pending && (
            <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm font-bold text-warning">This is only a headline from a listing page. Open it below and click Analyse in the extension to fill in the details.</p>
          )}
          {conflicts.length > 0 && (
            <div className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-warning">
              <p className="font-black">The sites disagree. Use the official notification to decide.</p>
              <ul className="mt-1 grid gap-1">
                {conflicts.map((conflict) => (
                  <li key={conflict.field}><b>{conflict.label}:</b> {conflict.values.map((value) => `${value.site} says ${value.value}`).join("; ")}</li>
                ))}
              </ul>
            </div>
          )}

          <Card title={pending ? "Details" : "Details as reviewed"}>
            <form className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="id" value={lead.id} />
              <fieldset disabled={!pending} className="contents">
                <div className="md:col-span-2"><Field label="Title"><input name="title" defaultValue={pending ? tidyTitle(fields.title) : fields.title} className={inputClass} /></Field></div>
                <Field label="Organisation" hint="Pick an existing one, or leave this empty and type a new name.">
                  <select name="organisation_id" defaultValue={fields.organisationId ?? ""} className={inputClass}>
                    <option value="">New organisation (name on the right)</option>
                    {(await listOrganisationOptions()).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                </Field>
                <Field label="New organisation name"><input name="organisation_name" defaultValue={fields.organisationName ?? ""} className={inputClass} /></Field>
                <Field label="State" hint="For a new organisation. Central Government if left empty.">
                  <input name="state_name" list="lead-states" defaultValue={fields.stateName ?? ""} className={inputClass} />
                  <datalist id="lead-states">{(await listStates()).map((state) => <option key={state.id} value={state.name} />)}</datalist>
                </Field>
                <Field label="Notification number"><input name="notification_number" defaultValue={fields.notificationNumber ?? ""} className={inputClass} /></Field>
                <Field label="Notification date"><input name="notification_date" type="date" defaultValue={fields.notificationDate ?? ""} className={inputClass} /></Field>
                <Field label="Applications open"><input name="application_start_date" type="date" defaultValue={fields.applicationStartDate ?? ""} className={inputClass} /></Field>
                <Field label="Last date to apply"><input name="application_end_date" type="date" defaultValue={fields.applicationEndDate ?? ""} className={inputClass} /></Field>
                <Field label="Total vacancies" hint="Posts with no count of their own show this total with a *."><input name="vacancy_count" inputMode="numeric" defaultValue={fields.vacancyCount ?? ""} className={inputClass} /></Field>
                <div className="md:col-span-2"><Field label="Qualification" hint="Used for posts that do not list their own. Write Any graduate when every degree is accepted; name B.E/B.Tech only when the post needs it."><input name="qualification_text" defaultValue={fields.qualificationText ?? ""} className={inputClass} /></Field></div>
                <div className="md:col-span-2"><Field label="Salary" hint="As the notification states it, for example Rs. 27,000 - Rs. 67,600 per month."><input name="salary_text" defaultValue={fields.salaryText ?? ""} className={inputClass} /></Field></div>
                <div className="md:col-span-2"><Field label="Official notification link" hint="The government PDF or page, not a competitor's."><input name="official_notification_url" list="lead-links" defaultValue={fields.officialNotificationUrl ?? ""} className={inputClass} /></Field></div>
                <div className="md:col-span-2"><Field label="Official application link"><input name="official_application_url" list="lead-links" defaultValue={fields.officialApplicationUrl ?? ""} className={inputClass} /></Field></div>
                <div className="md:col-span-2"><Field label="Official website"><input name="official_website_url" list="lead-links" defaultValue={fields.officialWebsiteUrl ?? ""} className={inputClass} /></Field></div>
                <datalist id="lead-links">{linkChoices.map((link) => <option key={link.href} value={link.href}>{link.official ? "Official" : "Other"}: {link.text}</option>)}</datalist>
                <div className="md:col-span-2">
                  <Field label="Posts" hint="One per line: Post name | vacancies | qualification. Each line becomes a post candidates can match against.">
                    <textarea name="posts" rows={Math.min(12, Math.max(4, fields.posts.length + 1))} defaultValue={formatPostLines(fields.posts)} className={`${inputClass} font-mono`} />
                  </Field>
                </div>
                {pending && (
                  <>
                    <div className="md:col-span-2">
                      <Field label="What you checked" hint="Required to publish. Kept in the audit trail, for example: Checked the PDF on the commission website; dates and vacancies match.">
                        <textarea name="note" rows={3} className={inputClass} />
                      </Field>
                    </div>
                    <label className="flex items-start gap-2 text-sm font-black text-primary md:col-span-2">
                      <input type="checkbox" name="verified" className="mt-1 size-4" /> I checked these details against the official notification.
                    </label>
                    <div className="flex flex-wrap gap-3 md:col-span-2">
                      <SubmitButton formAction={reviewLead.bind(null, "publish")}>Approve and publish</SubmitButton>
                      <SubmitButton formAction={reviewLead.bind(null, "draft")} variant="secondary">Create a draft recruitment</SubmitButton>
                      <SubmitButton formAction={reviewLead.bind(null, "save")} variant="secondary">Save changes</SubmitButton>
                      <SubmitButton formAction={reviewLead.bind(null, "duplicate")} variant="secondary">Duplicate</SubmitButton>
                      <SubmitButton formAction={reviewLead.bind(null, "reject")} variant="danger">Reject</SubmitButton>
                    </div>
                  </>
                )}
              </fieldset>
            </form>
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card title="Seen on">
            <ul className="grid gap-3 text-sm">
              {sources.map((source) => (
                <li key={source.id}>
                  <p className="font-black text-primary">{source.site}</p>
                  <a href={source.source_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-start gap-1 break-all text-xs font-semibold text-muted underline">{source.page_title || source.source_url} <ExternalLink size={12} className="mt-0.5 shrink-0" aria-hidden="true" /></a>
                  <p className="text-xs text-muted">Captured {new Date(source.captured_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                  {source.captured_text && (
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer font-black text-primary">Captured text</summary>
                      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-2 text-muted">{source.captured_text.slice(0, 4000)}</pre>
                      <p className="mt-1 text-muted">Kept for checking only. Do not copy it onto the site.</p>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Links found on the pages">
            {linkChoices.length ? (
              <ul className="grid gap-2 text-xs">
                {linkChoices.slice(0, 25).map((link) => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold text-primary underline">{link.text || link.href}</a>
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 font-black ${link.official ? "bg-mint text-success" : link.rowLabelled ? "bg-cyan-soft text-teal" : "bg-surface text-muted"}`}>{link.official ? "government site" : link.rowLabelled ? "labelled by the source page" : "other site"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No outside links were found on the captured pages.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
