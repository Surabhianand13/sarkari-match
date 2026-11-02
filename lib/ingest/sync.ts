import { writeAudit } from "@/lib/admin/audit";
import { applicableFields, latestChanges } from "@/lib/ingest/changes";
import { LEAD_COLUMNS, LeadError, approveLead, fieldsOf, saveParsed, type LeadRow } from "@/lib/ingest/leads";
import { parseListing, siteOf, vacancyFromTitle, type CapturePayload } from "@/lib/ingest/parse";
import { todayInIndia } from "@/lib/data/status";
import type { Db } from "@/lib/db";

// One-click sync: the extension sends a listing page, and the server answers which of its notifications still need their own page read.

export type PlanReason = "new" | "headline_only" | "updated_on_site" | "recheck";
export type PlanItem = { url: string; title: string; reason: PlanReason; listingDate?: string };
export type PlanResult = {
  spotted: number;
  tooOld: number;
  created: number;
  seenOnAnotherSite: number;
  unchanged: number;
  todo: PlanItem[];
};

const RECHECK_AFTER_DAYS = 2;

type KnownSource = { listing_date: string | null; captured_at: string; detail_captured: boolean; status: string; application_end_date: string | null };

export async function planListing(db: Db, payload: CapturePayload, tokenId: string | null, since?: string): Promise<PlanResult> {
  const entries = parseListing(payload);
  const result: PlanResult = { spotted: entries.length, tooOld: 0, created: 0, seenOnAnotherSite: 0, unchanged: 0, todo: [] };
  const today = todayInIndia();
  const staleBefore = Date.now() - RECHECK_AFTER_DAYS * 86_400_000;

  for (const entry of entries) {
    if (since && entry.postedOn && entry.postedOn < since) {
      result.tooOld++;
      continue;
    }
    const known = (
      await db.query<KnownSource>(
        `select s.listing_date::text, s.captured_at::text, l.detail_captured, l.status, l.application_end_date::text
         from lead_sources s join notification_leads l on l.id = s.lead_id where s.source_url = $1`,
        [entry.url]
      )
    ).rows[0];

    if (!known) {
      // A headline-only lead is made now, so it is in the queue even if reading its page fails later.
      const saved = await saveParsed(db, {
        parsed: { leadType: entry.leadType, title: entry.title, vacancyCount: vacancyFromTitle(entry.title), applicationEndDate: entry.lastDate, posts: [], links: [] },
        sourceUrl: entry.url,
        site: siteOf(entry.url),
        pageTitle: entry.title,
        text: null,
        tokenId,
        detail: false,
        listingDate: entry.postedOn
      });
      if (saved.outcome === "created") result.created++;
      else if (saved.outcome === "merged") result.seenOnAnotherSite++;
      else {
        result.unchanged++;
        continue;
      }
      result.todo.push({ url: entry.url, title: entry.title, reason: "new", listingDate: entry.postedOn });
      continue;
    }

    if (known.status === "rejected" || known.status === "duplicate") {
      result.unchanged++;
      continue;
    }
    let reason: PlanReason | undefined;
    if (!known.detail_captured) reason = "headline_only";
    else if (entry.postedOn && known.listing_date && entry.postedOn > known.listing_date) reason = "updated_on_site";
    else if (!entry.postedOn && Date.parse(known.captured_at) < staleBefore && (!known.application_end_date || known.application_end_date >= today)) reason = "recheck";
    if (reason) result.todo.push({ url: entry.url, title: entry.title, reason, listingDate: entry.postedOn });
    else result.unchanged++;
  }
  return result;
}

// ---- Changes on the source of a lead that is already decided ----

export async function markUpdatesSeen(db: Db, id: string) {
  await db.query("update notification_leads set updates_seen_at = now() where id = $1", [id]);
}

export async function countUnseenUpdates(db: Db): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    "select count(*) from notification_leads where jsonb_array_length(source_updates) > 0 and (updates_seen_at is null or updates_seen_at < (source_updates->-1->>'at')::timestamptz)"
  );
  return Number(rows[0].count);
}

// Copies the newest last date, start date and vacancy total from the source onto the recruitment this lead created.
export async function applySourceChanges(db: Db, input: { id: string; actorId: string }): Promise<string[]> {
  return db.transaction(async (tx) => {
    const lead = (await tx.query<LeadRow>(`select ${LEAD_COLUMNS} from notification_leads where id = $1 for update`, [input.id])).rows[0];
    if (!lead) throw new LeadError("Lead not found.");
    if (!lead.recruitment_id) throw new LeadError("This lead has no published or draft recruitment to update.");
    const latest = latestChanges(lead.source_updates ?? []);
    const applied: string[] = [];
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const [field, { column, label }] of Object.entries(applicableFields)) {
      const change = latest.get(field);
      if (!change) continue;
      const current = (await tx.query<Record<string, unknown>>(`select ${column}::text as value from recruitments where id = $1`, [lead.recruitment_id])).rows[0]?.value;
      if (String(current ?? "") === change.to) continue;
      await tx.query(`update recruitments set ${column} = $2, updated_at = now() where id = $1`, [lead.recruitment_id, change.to]);
      before[column] = current ?? null;
      after[column] = change.to;
      applied.push(`${label}: ${current ?? "none"} to ${change.to}`);
    }
    await tx.query("update notification_leads set updates_seen_at = now() where id = $1", [input.id]);
    if (applied.length) await writeAudit(tx, { actorId: input.actorId, action: "recruitment.update", entityType: "recruitment", entityId: lead.recruitment_id, before, after: { ...after, from: "competitor source change" } });
    return applied;
  });
}

// ---- Publishing many at once ----

export type BulkResult = { published: number; failed: Array<{ id: string; title: string; reason: string }> };

// Publishes each lead as it stands, with one shared note. A lead that is missing something is skipped and reported, never half published.
export async function bulkPublish(db: Db, input: { ids: string[]; actorId: string; note: string }): Promise<BulkResult> {
  const result: BulkResult = { published: 0, failed: [] };
  for (const id of input.ids.slice(0, 300)) {
    const lead = (await db.query<LeadRow>(`select ${LEAD_COLUMNS} from notification_leads where id = $1`, [id])).rows[0];
    if (!lead) continue;
    try {
      await approveLead(db, { id, actorId: input.actorId, mode: "publish", fields: fieldsOf(lead), note: input.note });
      result.published++;
    } catch (error) {
      result.failed.push({ id, title: lead.title, reason: error instanceof LeadError ? error.message : "Could not publish this one." });
    }
  }
  return result;
}

