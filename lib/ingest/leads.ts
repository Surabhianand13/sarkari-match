import { writeAudit } from "@/lib/admin/audit";
import { slugify } from "@/lib/admin/forms";
import { formatProblems, mergeFields, missingFields, publishProblems, type LeadFields } from "@/lib/ingest/fields";
import {
  cleanUrl,
  findMatch,
  parseCapture,
  parseListing,
  salaryBounds,
  siteOf,
  vacancyFromTitle,
  type CapturePayload,
  type LeadPost,
  type LeadType,
  type MatchCandidate,
  type ParseContext,
  type ParsedLead
} from "@/lib/ingest/parse";
import { normalizeQualificationLevel } from "@/lib/matching/profile";
import type { Db } from "@/lib/db";

export const leadStatuses = ["pending", "published", "drafted", "rejected", "duplicate"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

// A problem the reviewer can fix (a missing link, a lead someone else already handled). Shown as a message, not an error page.
export class LeadError extends Error {}

export type LeadRow = {
  id: string;
  status: LeadStatus;
  lead_type: LeadType;
  detail_captured: boolean;
  organisation_id: string | null;
  organisation_name: string | null;
  title: string;
  notification_number: string | null;
  state_name: string | null;
  qualification_text: string | null;
  salary_text: string | null;
  notification_date: string | null;
  application_start_date: string | null;
  application_end_date: string | null;
  vacancy_count: number | null;
  official_notification_url: string | null;
  official_application_url: string | null;
  official_website_url: string | null;
  posts: LeadPost[];
  matched_recruitment_id: string | null;
  recruitment_id: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

const LEAD_COLUMNS = `id, status, lead_type, detail_captured, organisation_id, organisation_name, title, notification_number, state_name, qualification_text, salary_text,
  notification_date::text, application_start_date::text, application_end_date::text, vacancy_count, official_notification_url, official_application_url,
  official_website_url, posts, matched_recruitment_id, recruitment_id, review_notes, reviewed_by, reviewed_at::text, created_at::text, updated_at::text`;

export function fieldsOf(row: LeadRow): LeadFields {
  return {
    organisationId: row.organisation_id,
    organisationName: row.organisation_name,
    title: row.title,
    notificationNumber: row.notification_number,
    stateName: row.state_name,
    qualificationText: row.qualification_text,
    salaryText: row.salary_text,
    notificationDate: row.notification_date,
    applicationStartDate: row.application_start_date,
    applicationEndDate: row.application_end_date,
    vacancyCount: row.vacancy_count,
    officialNotificationUrl: row.official_notification_url,
    officialApplicationUrl: row.official_application_url,
    officialWebsiteUrl: row.official_website_url,
    posts: row.posts ?? []
  };
}

function incomingFields(parsed: ParsedLead): Partial<LeadFields> {
  return {
    organisationId: parsed.organisationId ?? null,
    organisationName: parsed.organisationName ?? null,
    notificationNumber: parsed.notificationNumber ?? null,
    stateName: parsed.stateName ?? null,
    qualificationText: parsed.qualificationText ?? null,
    salaryText: parsed.salaryText ?? null,
    notificationDate: parsed.notificationDate ?? null,
    applicationStartDate: parsed.applicationStartDate ?? null,
    applicationEndDate: parsed.applicationEndDate ?? null,
    vacancyCount: parsed.vacancyCount ?? null,
    officialNotificationUrl: parsed.officialNotificationUrl ?? null,
    officialApplicationUrl: parsed.officialApplicationUrl ?? null,
    officialWebsiteUrl: parsed.officialWebsiteUrl ?? null,
    posts: parsed.posts
  };
}

export function todayInIndia() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ---- Capturing ----

export async function loadParseContext(db: Db): Promise<ParseContext> {
  const [organisations, states] = await Promise.all([
    db.query<{ id: string; name: string; short_name: string | null; official_website: string | null }>("select id, name, short_name, official_website from organisations where active"),
    db.query<{ name: string }>("select name from states order by name")
  ]);
  return {
    organisations: organisations.rows.map((org) => ({ id: org.id, name: org.name, shortName: org.short_name, website: org.official_website })),
    states: states.rows.map((state) => state.name)
  };
}

type LeadCandidate = MatchCandidate & { status: LeadStatus };

async function loadLeadCandidates(db: Db): Promise<LeadCandidate[]> {
  const { rows } = await db.query<{ id: string; status: LeadStatus; lead_type: LeadType; title: string; organisation_name: string | null; notification_number: string | null; vacancy_count: number | null; official_notification_url: string | null; official_application_url: string | null }>(
    `select id, status, lead_type, title, organisation_name, notification_number, vacancy_count, official_notification_url, official_application_url
     from notification_leads where created_at > now() - interval '120 days' order by created_at desc limit 1000`
  );
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    leadType: row.lead_type,
    title: row.title,
    organisationName: row.organisation_name,
    notificationNumber: row.notification_number,
    vacancyCount: row.vacancy_count,
    urls: [row.official_notification_url]
  }));
}

// A recruitment that is already on the site and looks like the same notification.
async function findExistingRecruitment(db: Db, parsed: Pick<LeadFields, "title" | "organisationName" | "notificationNumber" | "vacancyCount" | "officialNotificationUrl" | "officialApplicationUrl">) {
  const { rows } = await db.query<{ id: string; title: string; organisation_name: string; notification_number: string | null; official_notification_url: string | null; official_application_url: string | null; vacancy_count: number | null }>(
    `select r.id, r.title, o.name as organisation_name, r.notification_number, r.official_notification_url, r.official_application_url,
            coalesce(r.vacancy_total, (select sum(vacancy_count) from job_posts where recruitment_id = r.id))::int as vacancy_count
     from recruitments r join organisations o on o.id = r.organisation_id
     where r.editorial_status <> 'archived' and r.created_at > now() - interval '400 days' order by r.created_at desc limit 1500`
  );
  const match = findMatch(
    { title: parsed.title, organisationName: parsed.organisationName, notificationNumber: parsed.notificationNumber, vacancyCount: parsed.vacancyCount, urls: [parsed.officialNotificationUrl] },
    rows.map((row) => ({ id: row.id, title: row.title, organisationName: row.organisation_name, notificationNumber: row.notification_number, vacancyCount: row.vacancy_count, urls: [row.official_notification_url] }))
  );
  return match ? { id: match.candidate.id, title: match.candidate.title } : null;
}

export type IngestResult = {
  mode: "page";
  outcome: "created" | "merged" | "already_reviewed";
  leadId: string;
  status: LeadStatus;
  title: string;
  sources: number;
  matchReason?: string;
  missing: string[];
  found: { organisation?: string; lastDate?: string; vacancies?: number; posts: number; officialNotification: boolean; officialApplication: boolean };
  alreadyLive?: { id: string; title: string };
};

export type ListIngestResult = { mode: "list"; spotted: number; created: number; seenOnAnotherSite: number; alreadyKnown: number; alreadyReviewed: number };

type SaveInput = { parsed: ParsedLead; sourceUrl: string; site: string; pageTitle: string; text: string | null; tokenId: string | null; detail: boolean };

async function saveParsed(db: Db, input: SaveInput): Promise<IngestResult> {
  return db.transaction(async (tx) => {
    const { parsed, sourceUrl, detail } = input;
    let leadId = (await tx.query<{ lead_id: string }>("select lead_id from lead_sources where source_url = $1", [sourceUrl])).rows[0]?.lead_id;
    let matchReason = leadId ? "same page" : undefined;
    if (!leadId) {
      const match = findMatch(
        { leadType: parsed.leadType, title: parsed.title, organisationName: parsed.organisationName, notificationNumber: parsed.notificationNumber, vacancyCount: parsed.vacancyCount, urls: [parsed.officialNotificationUrl] },
        await loadLeadCandidates(tx)
      );
      if (match) {
        leadId = match.candidate.id;
        matchReason = match.reason;
      }
    }

    const { links, ...parsedFields } = parsed;
    const writeSource = async (id: string) =>
      tx.query(
        `insert into lead_sources (lead_id, token_id, site, source_url, page_title, captured_text, links, parsed)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (source_url) do update set token_id = excluded.token_id, page_title = excluded.page_title, captured_text = coalesce(excluded.captured_text, lead_sources.captured_text),
           links = excluded.links, parsed = excluded.parsed, captured_at = now()`,
        [id, input.tokenId, input.site, sourceUrl, input.pageTitle.slice(0, 300), input.text, JSON.stringify(links), JSON.stringify(parsedFields)]
      );
    const sourceCount = async (id: string) => Number((await tx.query<{ count: string }>("select count(*) from lead_sources where lead_id = $1", [id])).rows[0].count);
    const summarise = (fields: LeadFields): IngestResult["found"] => ({
      organisation: fields.organisationName ?? undefined,
      lastDate: fields.applicationEndDate ?? undefined,
      vacancies: fields.vacancyCount ?? undefined,
      posts: fields.posts.length,
      officialNotification: Boolean(fields.officialNotificationUrl),
      officialApplication: Boolean(fields.officialApplicationUrl)
    });

    if (leadId) {
      const row = (await tx.query<LeadRow>(`select ${LEAD_COLUMNS} from notification_leads where id = $1 for update`, [leadId])).rows[0];
      await writeSource(leadId);
      const existing = fieldsOf(row);
      // A lead someone already approved or rejected keeps its decision. The new page is only recorded as another source.
      if (row.status !== "pending") {
        return { mode: "page", outcome: "already_reviewed", leadId, status: row.status, title: row.title, sources: await sourceCount(leadId), matchReason, missing: [], found: summarise(existing) };
      }
      const merged = mergeFields(existing, incomingFields(parsed));
      const upgraded = detail && !row.detail_captured;
      const title = upgraded ? parsed.title : row.title;
      const matched = row.matched_recruitment_id ? null : await findExistingRecruitment(tx, { ...merged, title });
      await saveFields(tx, leadId, { ...merged, title }, { detailCaptured: row.detail_captured || detail, leadType: upgraded ? parsed.leadType : row.lead_type, matchedRecruitmentId: matched?.id ?? row.matched_recruitment_id });
      const alreadyLive = matched ?? (row.matched_recruitment_id ? (await tx.query<{ id: string; title: string }>("select id, title from recruitments where id = $1", [row.matched_recruitment_id])).rows[0] : undefined);
      return { mode: "page", outcome: "merged", leadId, status: "pending", title, sources: await sourceCount(leadId), matchReason, missing: missingFields(merged), found: summarise(merged), alreadyLive };
    }

    const fields = mergeFields({ ...blankFields(parsed.title) }, incomingFields(parsed));
    const matched = detail ? await findExistingRecruitment(tx, fields) : null;
    const created = await tx.query<{ id: string }>(
      `insert into notification_leads (lead_type, detail_captured, matched_recruitment_id, title) values ($1, $2, $3, $4) returning id`,
      [parsed.leadType, detail, matched?.id ?? null, fields.title]
    );
    const id = created.rows[0].id;
    await saveFields(tx, id, fields, { detailCaptured: detail, leadType: parsed.leadType, matchedRecruitmentId: matched?.id ?? null });
    await writeSource(id);
    return { mode: "page", outcome: "created", leadId: id, status: "pending", title: fields.title, sources: 1, missing: missingFields(fields), found: summarise(fields), alreadyLive: matched ?? undefined };
  });
}

function blankFields(title: string): LeadFields {
  return {
    organisationId: null, organisationName: null, title, notificationNumber: null, stateName: null, qualificationText: null, salaryText: null, notificationDate: null,
    applicationStartDate: null, applicationEndDate: null, vacancyCount: null, officialNotificationUrl: null, officialApplicationUrl: null, officialWebsiteUrl: null, posts: []
  };
}

async function saveFields(db: Db, id: string, fields: LeadFields, extra?: { detailCaptured?: boolean; leadType?: LeadType; matchedRecruitmentId?: string | null }) {
  await db.query(
    `update notification_leads set
       organisation_id = $2, organisation_name = $3, title = $4, notification_number = $5, state_name = $6, qualification_text = $7,
       notification_date = $8, application_start_date = $9, application_end_date = $10, vacancy_count = $11,
       official_notification_url = $12, official_application_url = $13, official_website_url = $14, posts = $15,
       detail_captured = coalesce($16, detail_captured), lead_type = coalesce($17, lead_type),
       matched_recruitment_id = case when $18 then $19 else matched_recruitment_id end, salary_text = $20, updated_at = now()
     where id = $1`,
    [
      id, fields.organisationId, fields.organisationName, fields.title, fields.notificationNumber, fields.stateName, fields.qualificationText,
      fields.notificationDate, fields.applicationStartDate, fields.applicationEndDate, fields.vacancyCount,
      fields.officialNotificationUrl, fields.officialApplicationUrl, fields.officialWebsiteUrl, JSON.stringify(fields.posts),
      extra?.detailCaptured ?? null, extra?.leadType ?? null, extra !== undefined && "matchedRecruitmentId" in extra, extra?.matchedRecruitmentId ?? null, fields.salaryText
    ]
  );
}

// One analysed page: a notification's own page.
export async function ingestPage(db: Db, payload: CapturePayload, tokenId: string | null): Promise<IngestResult> {
  const parsed = parseCapture(payload, await loadParseContext(db));
  const sourceUrl = cleanUrl(payload.url);
  if (!sourceUrl) throw new LeadError("The page address is not a web link.");
  return saveParsed(db, { parsed, sourceUrl, site: siteOf(sourceUrl), pageTitle: payload.title, text: payload.text.slice(0, 60_000), tokenId, detail: true });
}

// A listing page: every headline becomes a lead that still needs its detail page analysed.
export async function ingestListing(db: Db, payload: CapturePayload, tokenId: string | null): Promise<ListIngestResult> {
  const entries = parseListing(payload);
  const result: ListIngestResult = { mode: "list", spotted: entries.length, created: 0, seenOnAnotherSite: 0, alreadyKnown: 0, alreadyReviewed: 0 };
  for (const entry of entries) {
    const known = await db.query("select 1 from lead_sources where source_url = $1", [entry.url]);
    if (known.rowCount > 0) {
      result.alreadyKnown++;
      continue;
    }
    const saved = await saveParsed(db, {
      parsed: { leadType: entry.leadType, title: entry.title, vacancyCount: vacancyFromTitle(entry.title), posts: [], links: [] },
      sourceUrl: entry.url,
      site: siteOf(entry.url),
      pageTitle: entry.title,
      text: null,
      tokenId,
      detail: false
    });
    if (saved.outcome === "created") result.created++;
    else if (saved.outcome === "merged") result.seenOnAnotherSite++;
    else result.alreadyReviewed++;
  }
  return result;
}

// ---- Reviewing ----

export type LeadListItem = {
  id: string;
  status: LeadStatus;
  lead_type: LeadType;
  detail_captured: boolean;
  title: string;
  organisation: string | null;
  application_end_date: string | null;
  vacancy_count: number | null;
  official_notification_url: string | null;
  official_application_url: string | null;
  posts: LeadPost[];
  matched_recruitment_id: string | null;
  created_at: string;
  sites: string;
  source_count: number;
};

export async function listLeads(db: Db, status: LeadStatus | "all", limit = 200): Promise<LeadListItem[]> {
  const { rows } = await db.query<LeadListItem>(
    `select l.id, l.status, l.lead_type, l.detail_captured, l.title, coalesce(o.name, l.organisation_name) as organisation, l.application_end_date::text,
            l.vacancy_count, l.official_notification_url, l.official_application_url, l.posts, l.matched_recruitment_id, l.created_at::text,
            (select coalesce(string_agg(distinct s.site, ', '), '') from lead_sources s where s.lead_id = l.id) as sites,
            (select count(*) from lead_sources s where s.lead_id = l.id)::int as source_count
     from notification_leads l left join organisations o on o.id = l.organisation_id
     ${status === "all" ? "" : "where l.status = $2"} order by l.created_at desc limit $1`,
    status === "all" ? [limit] : [limit, status]
  );
  return rows;
}

export async function leadCounts(db: Db): Promise<Record<LeadStatus | "all", number>> {
  const { rows } = await db.query<{ status: LeadStatus; count: string }>("select status, count(*) from notification_leads group by status");
  const counts = { pending: 0, published: 0, drafted: 0, rejected: 0, duplicate: 0, all: 0 };
  for (const row of rows) {
    counts[row.status] = Number(row.count);
    counts.all += Number(row.count);
  }
  return counts;
}

export type LeadSource = { id: string; site: string; source_url: string; page_title: string | null; captured_text: string | null; links: Array<{ href: string; text: string; official: boolean; kind: string; rowLabelled?: boolean }>; parsed: Partial<ParsedLead>; captured_at: string };

export async function getLead(db: Db, id: string) {
  const lead = (await db.query<LeadRow>(`select ${LEAD_COLUMNS} from notification_leads where id = $1`, [id])).rows[0];
  if (!lead) return null;
  const sources = await db.query<LeadSource>("select id, site, source_url, page_title, captured_text, links, parsed, captured_at::text from lead_sources where lead_id = $1 order by captured_at", [id]);
  const matched = lead.matched_recruitment_id ? (await db.query<{ id: string; title: string; editorial_status: string }>("select id, title, editorial_status from recruitments where id = $1", [lead.matched_recruitment_id])).rows[0] : undefined;
  return { lead, sources: sources.rows, matched };
}

async function lockPending(tx: Db, id: string) {
  const row = (await tx.query<LeadRow>(`select ${LEAD_COLUMNS} from notification_leads where id = $1 for update`, [id])).rows[0];
  if (!row) throw new LeadError("Lead not found.");
  if (row.status !== "pending") throw new LeadError(`This lead was already ${row.status}.`);
  return row;
}

export async function saveLead(db: Db, id: string, fields: LeadFields, actorId: string) {
  const problems = formatProblems(fields);
  if (problems.length) throw new LeadError(problems.join(" "));
  await db.transaction(async (tx) => {
    await lockPending(tx, id);
    await saveFields(tx, id, fields);
    await writeAudit(tx, { actorId, action: "lead.update", entityType: "notification_lead", entityId: id, after: { title: fields.title } });
  });
}

export async function closeLead(db: Db, input: { id: string; actorId: string; status: "rejected" | "duplicate"; note: string }) {
  await db.transaction(async (tx) => {
    await lockPending(tx, input.id);
    await tx.query("update notification_leads set status = $2, review_notes = $3, reviewed_by = $4, reviewed_at = now(), updated_at = now() where id = $1", [input.id, input.status, input.note || null, input.actorId]);
    await writeAudit(tx, { actorId: input.actorId, action: `lead.${input.status}`, entityType: "notification_lead", entityId: input.id, after: { note: input.note || null } });
  });
}

async function uniqueSlug(tx: Db, table: "recruitments" | "job_posts", base: string) {
  const root = base || "notification";
  for (let attempt = 1; attempt <= 30; attempt++) {
    const candidate = attempt === 1 ? root : `${root}-${attempt}`;
    const taken = await tx.query(`select 1 from ${table} where slug = $1`, [candidate]);
    if (taken.rowCount === 0) return candidate;
  }
  throw new LeadError("Could not find a free web address for this notification. Change the title and try again.");
}

function qualificationRules(post: LeadPost, fallback: string | null) {
  const qualification = post.qualificationText ?? fallback ?? "";
  const level = normalizeQualificationLevel(qualification);
  return level ? { qualificationRules: [{ minimumLevel: level, mandatory: true, acceptedAnyDegree: true, ruleText: `${qualification.slice(0, 160)} qualification as per the official notification.` }] } : {};
}

// Approving creates the real organisation (when new), recruitment and posts from the reviewed fields.
// "publish" makes them live now; "draft" hands them to the normal recruitment workflow instead.
export async function approveLead(db: Db, input: { id: string; actorId: string; mode: "publish" | "draft"; fields: LeadFields; note: string; today?: string }): Promise<{ recruitmentId: string }> {
  const { fields, mode } = input;
  const today = input.today ?? todayInIndia();
  return db.transaction(async (tx) => {
    const lead = await lockPending(tx, input.id);
    const problems = formatProblems(fields);
    if (mode === "publish") {
      problems.push(...publishProblems(fields, { today, detailCaptured: lead.detail_captured, leadType: lead.lead_type }));
      if (input.note.trim().length < 10) problems.push("Write what you checked against the official notification.");
    } else if (!fields.organisationId && !fields.organisationName) {
      problems.push("Choose the organisation.");
    }
    if (problems.length) throw new LeadError(problems.join(" "));

    let organisationId = fields.organisationId;
    if (organisationId) {
      const exists = await tx.query("select 1 from organisations where id = $1", [organisationId]);
      if (exists.rowCount === 0) throw new LeadError("That organisation no longer exists.");
    } else {
      const name = fields.organisationName!.trim();
      const state = await tx.query<{ id: string }>("select id from states where lower(name) = lower($1) or slug = $2 limit 1", [fields.stateName ?? "Central Government", slugify(fields.stateName ?? "central-government")]);
      const website = fields.officialWebsiteUrl ? new URL(fields.officialWebsiteUrl).origin : null;
      const org = await tx.query<{ id: string }>(
        `insert into organisations (name, slug, state_id, official_website) values ($1, $2, $3, $4)
         on conflict (slug) do update set name = organisations.name returning id`,
        [name, slugify(name), state.rows[0]?.id ?? null, website]
      );
      organisationId = org.rows[0].id;
    }

    const sites = (await tx.query<{ site: string }>("select distinct site from lead_sources where lead_id = $1 order by site", [input.id])).rows.map((row) => row.site);
    const note = [input.note.trim(), sites.length ? `Spotted on: ${sites.join(", ")}.` : ""].filter(Boolean).join("\n");
    const recruitmentSlug = await uniqueSlug(tx, "recruitments", slugify(`${fields.title}-${fields.applicationEndDate ?? ""}`));
    const live = mode === "publish";
    const recruitment = await tx.query<{ id: string }>(
      `insert into recruitments (organisation_id, title, slug, notification_number, notification_date, application_start_date, application_end_date,
         official_notification_url, official_application_url, official_website_url, verification_notes, status, editorial_status, verified_at, verified_by, published_at, vacancy_total)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::editorial_status, case when $14::boolean then now() end, case when $14::boolean then $15::uuid end, case when $14::boolean then now() end, $16) returning id`,
      [
        organisationId, fields.title, recruitmentSlug, fields.notificationNumber, fields.notificationDate, fields.applicationStartDate, fields.applicationEndDate,
        fields.officialNotificationUrl, fields.officialApplicationUrl, fields.officialWebsiteUrl, note || null, live ? "published" : "draft", live ? "published" : "draft", live, input.actorId, fields.vacancyCount
      ]
    );
    const recruitmentId = recruitment.rows[0].id;

    const pay = salaryBounds(fields.salaryText);
    for (const post of fields.posts) {
      // A lone post with no count of its own holds the whole total. With several, the total stays on the recruitment and the site marks it with a "*".
      const vacancies = post.vacancyCount ?? (fields.posts.length === 1 ? fields.vacancyCount : null);
      const status = fields.applicationStartDate && fields.applicationStartDate > today ? "upcoming" : fields.applicationEndDate && fields.applicationEndDate < today ? "closed" : "open";
      const slug = await uniqueSlug(tx, "job_posts", slugify(`${post.title}-${recruitmentSlug}`));
      await tx.query(
        `insert into job_posts (recruitment_id, title, slug, vacancy_count, application_status, eligibility_rules, active, published_at, salary_text, salary_min, salary_max)
         values ($1,$2,$3,$4,$5,$6,$7::boolean, case when $7::boolean then now() end, $8, $9, $10)`,
        [recruitmentId, post.title, slug, vacancies, status, JSON.stringify(qualificationRules(post, fields.qualificationText)), live, fields.salaryText, pay?.min ?? null, pay?.max ?? null]
      );
    }

    await saveFields(tx, input.id, { ...fields, organisationId });
    await tx.query("update notification_leads set status = $2, recruitment_id = $3, review_notes = $4, reviewed_by = $5, reviewed_at = now() where id = $1", [input.id, live ? "published" : "drafted", recruitmentId, note || null, input.actorId]);
    await writeAudit(tx, { actorId: input.actorId, action: live ? "lead.publish" : "lead.draft", entityType: "notification_lead", entityId: input.id, after: { title: fields.title, recruitmentId, sites } });
    await writeAudit(tx, { actorId: input.actorId, action: "recruitment.create", entityType: "recruitment", entityId: recruitmentId, after: { title: fields.title, from: "competitor lead", status: live ? "published" : "draft" } });
    return { recruitmentId };
  });
}
