import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db";
import type { LeadFields } from "@/lib/ingest/fields";
import type { CapturePayload } from "@/lib/ingest/parse";

process.env.DATABASE_URL = "pglite://memory://";

let db: Db;
let adminId: string;

beforeAll(async () => {
  const { getDb } = await import("@/lib/db");
  db = (await getDb())!;
  for (const dir of ["db/migrations", "db/seed"]) for (const file of readdirSync(join(process.cwd(), dir)).sort()) await db.exec(readFileSync(join(process.cwd(), dir, file), "utf8"));
  adminId = (await db.query<{ id: string }>("insert into users (email, roles) values ('reviewer@example.com', '{admin}') returning id")).rows[0].id;
});

const page = (overrides: Partial<CapturePayload> = {}): CapturePayload => ({
  mode: "page",
  url: "https://rival-one.example/railway-group-d-2026",
  title: "Rail Vikas Group D Recruitment 2026 for 5000 Posts - Rival One",
  text: ["Organization Name : Rail Vikas Board", "Advt. No. : RVB/GD/2026/07", "Last Date to Apply Online : 30/12/2099", "Total Vacancy : 5,000", "Qualification : 10th Pass"].join("\n"),
  links: [
    { href: "https://rvb.gov.in/notice/gd-2026.pdf", text: "Download Notification" },
    { href: "https://rvb.gov.in/apply", text: "Apply Online" }
  ],
  tables: [[["Post Name", "Vacancy", "Qualification"], ["Track Maintainer", "3,000", "10th Pass"], ["Helper", "2,000", "10th Pass"]]],
  ...overrides
});

const noToken = null;

describe("collector tokens", () => {
  it("accepts a live token from an admin, never stores it, and stops at revoke", async () => {
    const { createIngestToken, authenticateIngestToken, revokeIngestToken, hashToken } = await import("@/lib/ingest/tokens");
    const { id, token } = await createIngestToken(db, "Office laptop", adminId);
    const stored = await db.query<{ token_hash: string }>("select token_hash from ingest_tokens where id = $1", [id]);
    expect(stored.rows[0].token_hash).toBe(hashToken(token));
    expect(stored.rows[0].token_hash).not.toContain(token);

    expect((await authenticateIngestToken(db, `Bearer ${token}`))?.label).toBe("Office laptop");
    expect(await authenticateIngestToken(db, "Bearer smx_notarealtokennotarealtoken")).toBeNull();
    expect(await authenticateIngestToken(db, null)).toBeNull();

    await db.query("update users set roles = '{}' where id = $1", [adminId]);
    expect(await authenticateIngestToken(db, `Bearer ${token}`)).toBeNull();
    await db.query("update users set roles = '{admin}' where id = $1", [adminId]);
    expect(await authenticateIngestToken(db, `Bearer ${token}`)).not.toBeNull();

    await revokeIngestToken(db, id);
    expect(await authenticateIngestToken(db, `Bearer ${token}`)).toBeNull();
  });
});

describe("capturing and collating", () => {
  let leadId: string;

  it("turns an analysed page into one pending lead and nothing public", async () => {
    const { ingestPage } = await import("@/lib/ingest/leads");
    const result = await ingestPage(db, page(), noToken);
    expect(result).toMatchObject({ outcome: "created", status: "pending", sources: 1, found: { lastDate: "2099-12-30", vacancies: 5000, posts: 2, officialNotification: true, officialApplication: true } });
    expect(result.missing).toEqual([]);
    leadId = result.leadId;

    const { getJobs } = await import("@/lib/data/jobs");
    expect((await getJobs()).some((job) => job.title === "Track Maintainer")).toBe(false);
    expect((await db.query("select 1 from recruitments where title ilike '%Rail Vikas%'")).rowCount).toBe(0);
  });

  it("analysing the same page again does not create a second lead", async () => {
    const { ingestPage } = await import("@/lib/ingest/leads");
    const result = await ingestPage(db, page({ url: "https://rival-one.example/railway-group-d-2026?utm_source=telegram#top" }), noToken);
    expect(result).toMatchObject({ outcome: "merged", leadId, sources: 1, matchReason: "same page" });
    expect((await db.query("select 1 from notification_leads")).rowCount).toBe(1);
  });

  it("collates a second site's page into the same lead and shows where they disagree", async () => {
    const { ingestPage, getLead } = await import("@/lib/ingest/leads");
    const { findConflicts } = await import("@/lib/ingest/parse");
    const result = await ingestPage(
      db,
      page({
        url: "https://rival-two.example/rrb-group-d",
        title: "RVB Group D Vacancy 2026 Notification Out",
        text: "Last Date : 05/01/2100\nTotal Posts: 5000",
        links: [{ href: "https://www.rvb.gov.in/notice/gd-2026.pdf?utm_source=x", text: "Notice PDF" }],
        tables: []
      }),
      noToken
    );
    expect(result).toMatchObject({ outcome: "merged", leadId, sources: 2, matchReason: "same official link" });

    const detail = (await getLead(db, leadId))!;
    expect(detail.sources.map((source) => source.site).sort()).toEqual(["rival-one.example", "rival-two.example"]);
    expect(detail.lead.application_end_date).toBe("2099-12-30");
    expect(findConflicts(detail.sources.map((source) => ({ site: source.site, parsed: source.parsed }))).map((conflict) => conflict.field)).toEqual(["applicationEndDate"]);
  });

  it("will not publish until the reviewer has checked it and given their reason", async () => {
    const { approveLead, getLead, LeadError, fieldsOf } = await import("@/lib/ingest/leads");
    const fields = fieldsOf((await getLead(db, leadId))!.lead);
    await expect(approveLead(db, { id: leadId, actorId: adminId, mode: "publish", fields, note: "" })).rejects.toThrow(LeadError);
    await expect(approveLead(db, { id: leadId, actorId: adminId, mode: "publish", fields: { ...fields, officialApplicationUrl: null }, note: "Checked on rvb.gov.in" })).rejects.toThrow(/application link/);
    await expect(approveLead(db, { id: leadId, actorId: adminId, mode: "publish", fields: { ...fields, applicationEndDate: "2020-01-01" }, note: "Checked on rvb.gov.in" })).rejects.toThrow(/already passed/);
    expect((await db.query("select 1 from recruitments where title ilike '%Rail Vikas%'")).rowCount).toBe(0);
  });

  it("publishing creates the organisation, recruitment and posts and puts them live", async () => {
    const { approveLead, getLead, fieldsOf } = await import("@/lib/ingest/leads");
    const fields = fieldsOf((await getLead(db, leadId))!.lead);
    const { recruitmentId } = await approveLead(db, { id: leadId, actorId: adminId, mode: "publish", fields, note: "Checked the PDF on rvb.gov.in: dates and vacancies match." });

    const recruitment = await db.query<{ editorial_status: string; verified_by: string; verification_notes: string; organisation: string }>(
      "select r.editorial_status, r.verified_by, r.verification_notes, o.name as organisation from recruitments r join organisations o on o.id = r.organisation_id where r.id = $1",
      [recruitmentId]
    );
    expect(recruitment.rows[0]).toMatchObject({ editorial_status: "published", verified_by: adminId, organisation: "Rail Vikas Board" });
    expect(recruitment.rows[0].verification_notes).toContain("rival-one.example");

    const posts = await db.query<{ title: string; active: boolean; vacancy_count: number; rules: { qualificationRules?: Array<{ minimumLevel: string }> } }>(
      "select title, active, vacancy_count, eligibility_rules as rules from job_posts where recruitment_id = $1 order by title",
      [recruitmentId]
    );
    expect(posts.rows.map((post) => [post.title, post.active, post.vacancy_count])).toEqual([["Helper", true, 2000], ["Track Maintainer", true, 3000]]);
    expect(posts.rows[0].rules.qualificationRules?.[0].minimumLevel).toBe("10th-pass");

    const { getJobs } = await import("@/lib/data/jobs");
    expect((await getJobs()).some((job) => job.title === "Track Maintainer")).toBe(true);

    const audit = await db.query<{ action: string }>("select action from audit_logs where entity_id in ($1, $2) order by created_at", [leadId, recruitmentId]);
    expect(audit.rows.map((row) => row.action)).toEqual(expect.arrayContaining(["lead.publish", "recruitment.create"]));
    expect((await db.query<{ status: string }>("select status from notification_leads where id = $1", [leadId])).rows[0].status).toBe("published");
  });

  it("keeps the decision when the same notification is analysed again, and cannot be approved twice", async () => {
    const { ingestPage, approveLead, getLead, fieldsOf, LeadError } = await import("@/lib/ingest/leads");
    const result = await ingestPage(db, page({ url: "https://rival-three.example/rvb-gd", title: "Rail Vikas Group D Recruitment 2026 for 5000 Posts" }), noToken);
    expect(result).toMatchObject({ outcome: "already_reviewed", leadId, status: "published" });
    expect((await db.query("select 1 from notification_leads")).rowCount).toBe(1);

    const fields = fieldsOf((await getLead(db, leadId))!.lead);
    await expect(approveLead(db, { id: leadId, actorId: adminId, mode: "publish", fields, note: "Checked again" })).rejects.toThrow(LeadError);
  });
});

describe("listing pages", () => {
  const listing: CapturePayload = {
    mode: "list",
    url: "https://rival-one.example/",
    title: "Rival One",
    text: "",
    tables: [],
    links: [
      { href: "https://rival-one.example/up-police-si-2026", text: "UP Police Sub Inspector Recruitment 2026 Apply Online" },
      { href: "https://rival-one.example/about", text: "About this website for readers" }
    ]
  };

  it("records headlines as leads that cannot be approved until the page itself is analysed", async () => {
    const { ingestListing, approveLead, getLead, fieldsOf, LeadError } = await import("@/lib/ingest/leads");
    const first = await ingestListing(db, listing, noToken);
    expect(first).toMatchObject({ spotted: 1, created: 1, alreadyKnown: 0 });
    expect(await ingestListing(db, listing, noToken)).toMatchObject({ created: 0, alreadyKnown: 1 });

    const stub = (await db.query<{ id: string; detail_captured: boolean }>("select id, detail_captured from notification_leads where title ilike '%UP Police%'")).rows[0];
    expect(stub.detail_captured).toBe(false);
    const fields = fieldsOf((await getLead(db, stub.id))!.lead);
    await expect(approveLead(db, { id: stub.id, actorId: adminId, mode: "publish", fields: { ...fields, organisationName: "UP Police", officialNotificationUrl: "https://uppbpb.gov.in/a.pdf", officialApplicationUrl: "https://uppbpb.gov.in/apply", applicationEndDate: "2099-01-01", posts: [{ title: "Sub Inspector" }] }, note: "Checked on the board website" })).rejects.toThrow(/headline/);
  });

  it("fills the headline in when its page is analysed, and the other site's copy joins it", async () => {
    const { ingestPage, ingestListing } = await import("@/lib/ingest/leads");
    const filled = await ingestPage(
      db,
      page({
        url: "https://rival-one.example/up-police-si-2026",
        title: "UP Police Sub Inspector Recruitment 2026 - Rival One",
        text: "Organization Name : UP Police Recruitment Board\nLast Date : 15/03/2099\nTotal Vacancy: 4000",
        links: [{ href: "https://uppbpb.gov.in/notice.pdf", text: "Notification PDF" }],
        tables: []
      }),
      noToken
    );
    expect(filled).toMatchObject({ outcome: "merged", sources: 1, found: { lastDate: "2099-03-15", vacancies: 4000 } });
    expect((await db.query<{ detail_captured: boolean }>("select detail_captured from notification_leads where id = $1", [filled.leadId])).rows[0].detail_captured).toBe(true);

    const other = await ingestListing(db, { ...listing, url: "https://rival-two.example/", links: [{ href: "https://rival-two.example/up-si", text: "UP Police Sub Inspector Recruitment 2026 Apply Online" }] }, noToken);
    expect(other).toMatchObject({ created: 0, seenOnAnotherSite: 1 });
  });
});

describe("drafts, rejects and duplicates", () => {
  it("a draft goes to the normal recruitment workflow and is not live", async () => {
    const { ingestPage, approveLead, getLead, fieldsOf } = await import("@/lib/ingest/leads");
    const result = await ingestPage(db, page({ url: "https://rival-one.example/coast-guard", title: "Coast Guard Navik Recruitment 2026 for 300 Posts", text: "Last Date: 01/02/2099", links: [], tables: [] }), noToken);
    expect(result.missing).toEqual(expect.arrayContaining(["organisation", "notification link", "apply link"]));
    const fields = fieldsOf((await getLead(db, result.leadId))!.lead);
    const { recruitmentId } = await approveLead(db, { id: result.leadId, actorId: adminId, mode: "draft", fields: { ...fields, organisationName: "Indian Coast Guard" }, note: "" });
    expect((await db.query<{ editorial_status: string }>("select editorial_status from recruitments where id = $1", [recruitmentId])).rows[0].editorial_status).toBe("draft");
    expect((await db.query<{ active: boolean }>("select active from job_posts where recruitment_id = $1", [recruitmentId])).rows.every((post) => !post.active)).toBe(true);
    expect((await db.query<{ status: string }>("select status from notification_leads where id = $1", [result.leadId])).rows[0].status).toBe("drafted");
  });

  it("a rejected lead stays rejected when it is spotted again", async () => {
    const { ingestPage, closeLead } = await import("@/lib/ingest/leads");
    const url = "https://rival-one.example/fake-job";
    const first = await ingestPage(db, page({ url, title: "Work From Home Government Job Recruitment 2026", text: "", links: [], tables: [] }), noToken);
    await closeLead(db, { id: first.leadId, actorId: adminId, status: "rejected", note: "Not a real notification" });
    expect(await ingestPage(db, page({ url, title: "Work From Home Government Job Recruitment 2026", text: "", links: [], tables: [] }), noToken)).toMatchObject({ outcome: "already_reviewed", status: "rejected" });
  });

  it("warns when the notification is already on the site", async () => {
    const { ingestPage } = await import("@/lib/ingest/leads");
    const result = await ingestPage(
      db,
      page({
        url: "https://rival-two.example/demo-ssc",
        title: "Demo SSC Combined Recruitment 2026 Apply Online",
        text: "Last Date: 15/08/2099",
        links: [{ href: "https://example.com/notification.pdf", text: "Notification" }],
        tables: []
      }),
      noToken
    );
    expect(result.alreadyLive?.title).toBe("Demo SSC Combined Recruitment 2026");
  });
});

describe("the review lists", () => {
  it("counts leads by status and lists them newest first", async () => {
    const { leadCounts, listLeads } = await import("@/lib/ingest/leads");
    const counts = await leadCounts(db);
    expect(counts.published).toBe(1);
    expect(counts.drafted).toBe(1);
    expect(counts.rejected).toBe(1);
    expect(counts.pending).toBeGreaterThanOrEqual(2);
    expect(counts.all).toBe(counts.pending + counts.published + counts.drafted + counts.rejected + counts.duplicate);
    const pending = await listLeads(db, "pending");
    expect(pending.every((lead) => lead.status === "pending")).toBe(true);
    expect((await listLeads(db, "all")).length).toBe(counts.all);
  });
});

describe("saving edits", () => {
  it("rejects a bad date or link and keeps the old values", async () => {
    const { ingestPage, saveLead, getLead, fieldsOf, LeadError } = await import("@/lib/ingest/leads");
    const result = await ingestPage(db, page({ url: "https://rival-one.example/edit-me", title: "Postal Circle Gramin Dak Sevak Recruitment 2026", text: "Last Date: 01/06/2099", links: [], tables: [] }), noToken);
    const fields: LeadFields = fieldsOf((await getLead(db, result.leadId))!.lead);
    await expect(saveLead(db, result.leadId, { ...fields, officialApplicationUrl: "javascript:alert(1)" }, adminId)).rejects.toThrow(LeadError);
    await expect(saveLead(db, result.leadId, { ...fields, applicationEndDate: "2099-02-31" }, adminId)).rejects.toThrow(/valid date/);
    await saveLead(db, result.leadId, { ...fields, organisationName: "India Post", vacancyCount: 100 }, adminId);
    expect((await getLead(db, result.leadId))!.lead).toMatchObject({ organisation_name: "India Post", vacancy_count: 100, application_end_date: "2099-06-01" });
  });
});
