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

describe("a total with no split by post, and the pay", () => {
  it("publishes the total for posts without a count, marked as shared, and carries the pay across", async () => {
    const { ingestPage, approveLead, getLead, fieldsOf } = await import("@/lib/ingest/leads");
    const result = await ingestPage(
      db,
      page({
        url: "https://rival-one.example/tgpsc-planning-2026",
        title: "TGPSC Mandal Planning Statistical Officer Recruitment 2026 for 102 Posts",
        text: ["Organization Name : Telangana Planning Commission", "Last Date to Apply Online : 27/11/2099", "Total Vacancy : 102", "Salary\tRs. 27,000 - Rs. 67,600 per month (pay scale varies by post)", "Qualification : Any Graduate"].join("\n"),
        links: [{ href: "https://websitenew.tgpsc.gov.in/notice/planning.pdf", text: "Download Notification" }, { href: "https://tgpsc.gov.in/apply", text: "Apply Online" }],
        tables: [[["Post Name", "Qualification"], ["Mandal Planning", "Any Graduate"], ["Statistical Officer / Assistant Statistical Officer", "Any Graduate"]]]
      }),
      noToken
    );
    const fields = fieldsOf((await getLead(db, result.leadId))!.lead);
    expect(fields).toMatchObject({ vacancyCount: 102, salaryText: "Rs. 27,000 - Rs. 67,600 per month (pay scale varies by post)" });
    expect(fields.posts.map((post) => post.vacancyCount)).toEqual([undefined, undefined]);

    const { recruitmentId } = await approveLead(db, { id: result.leadId, actorId: adminId, mode: "publish", fields: { ...fields, organisationName: "Telangana Planning Commission" }, note: "Checked the PDF on tgpsc.gov.in: total and pay match." });
    expect((await db.query<{ vacancy_total: number }>("select vacancy_total from recruitments where id = $1", [recruitmentId])).rows[0].vacancy_total).toBe(102);
    const posts = await db.query<{ vacancy_count: number | null; salary_text: string; salary_min: number; salary_max: number }>("select vacancy_count, salary_text, salary_min, salary_max from job_posts where recruitment_id = $1", [recruitmentId]);
    expect(posts.rows).toHaveLength(2);
    expect(posts.rows.every((post) => post.vacancy_count === null && post.salary_min === 27000 && post.salary_max === 67600 && post.salary_text.includes("27,000"))).toBe(true);

    const { getJobs } = await import("@/lib/data/jobs");
    const live = (await getJobs()).filter((job) => job.recruitmentTitle.includes("TGPSC"));
    expect(live).toHaveLength(2);
    expect(live.every((job) => job.vacancyCount === 102 && job.vacancyShared && job.salaryText.includes("67,600"))).toBe(true);
    const rules = (await db.query<{ rules: { qualificationRules: Array<{ minimumLevel: string }> } }>("select eligibility_rules as rules from job_posts where recruitment_id = $1", [recruitmentId])).rows[0].rules;
    expect(rules.qualificationRules[0].minimumLevel).toBe("graduate");
  });

  it("shows a star only where the number is the whole notification total", async () => {
    const { vacancyFigure, vacancyPhrase, vacancyPlain } = await import("@/lib/data/vacancies");
    expect(vacancyFigure({ vacancyCount: 102, vacancyShared: true })).toBe("102*");
    expect(vacancyFigure({ vacancyCount: 3000, vacancyShared: false })).toBe("3,000");
    expect(vacancyFigure({ vacancyCount: 0, vacancyShared: false })).toBe("As per notification");
    expect(vacancyPhrase({ vacancyCount: 0, vacancyShared: false })).toBe("Vacancies as per notification");
    expect(vacancyPlain({ vacancyCount: 102, vacancyShared: true })).toBe("102 vacancies in total");
  });
});

describe("past notifications and the active count", () => {
  it("publishes a notification whose last date has passed, and it shows as past without anyone updating it", async () => {
    const { ingestPage, approveLead, getLead, fieldsOf } = await import("@/lib/ingest/leads");
    const result = await ingestPage(
      db,
      page({
        url: "https://rival-one.example/old-clerk-2024",
        title: "Old Cooperative Bank Clerk Recruitment 2024 for 40 Posts",
        text: ["Organization Name : Old Cooperative Bank", "Last Date to Apply Online : 15/03/2024", "Total Vacancy : 40", "Qualification : Any Graduate"].join("\n"),
        links: [{ href: "https://oldbank.gov.in/notice/clerk-2024.pdf", text: "Download Notification" }, { href: "https://oldbank.gov.in/apply", text: "Apply Online" }],
        tables: []
      }),
      noToken
    );
    const fields = fieldsOf((await getLead(db, result.leadId))!.lead);
    const { recruitmentId } = await approveLead(db, { id: result.leadId, actorId: adminId, mode: "publish", fields, note: "Archive entry checked on oldbank.gov.in." });
    expect((await db.query<{ application_status: string }>("select application_status::text from job_posts where recruitment_id = $1", [recruitmentId])).rows[0].application_status).toBe("closed");

    const { getJobs } = await import("@/lib/data/jobs");
    const jobs = await getJobs();
    const old = jobs.find((job) => job.recruitmentTitle.includes("Old Cooperative"))!;
    expect(old.applicationStatus).toBe("closed");
    // Open notifications are listed before past ones.
    const order = jobs.map((job) => job.applicationStatus);
    expect(order.indexOf("closed")).toBeGreaterThan(order.lastIndexOf("open"));
  });

  it("counts active, upcoming and past notifications for the admin overview, and stored status does not matter", async () => {
    const { getAdminStats } = await import("@/lib/admin/stats");
    const before = (await getAdminStats())!;
    // A post saved as open whose recruitment ended long ago is past; one saved as closed is not active either.
    const org = (await db.query<{ id: string }>("select id from organisations limit 1")).rows[0].id;
    const make = async (slug: string, start: string | null, end: string, status: string) => {
      const r = (await db.query<{ id: string }>("insert into recruitments (organisation_id, title, slug, application_start_date, application_end_date, editorial_status, status, published_at) values ($1,$2,$3,$4,$5,'published','published', now()) returning id", [org, slug, slug, start, end])).rows[0].id;
      await db.query("insert into job_posts (recruitment_id, title, slug, application_status, active, published_at) values ($1,$2,$2,$3::application_status,true,now())", [r, slug, status]);
    };
    await make("stat-active", "2020-01-01", "2099-01-01", "open");
    await make("stat-upcoming", "2098-01-01", "2099-01-01", "open");
    await make("stat-stale-open", "2019-01-01", "2020-01-01", "open");
    await make("stat-manual-closed", "2020-01-01", "2099-01-01", "closed");
    const after = (await getAdminStats())!;
    expect(after.activeNotifications - before.activeNotifications).toBe(1);
    expect(after.activePosts - before.activePosts).toBe(1);
    expect(after.upcomingNotifications - before.upcomingNotifications).toBe(1);
    expect(after.pastNotifications - before.pastNotifications).toBe(2);
  });
});

// A notification page that shares nothing with the others above, so it stays its own lead.
const fresh = (slug: string, overrides: { lastDate?: string; vacancies?: number } = {}): CapturePayload =>
  page({
    url: `https://rival-two.example/${slug}`,
    title: `${slug} Technical Assistant Recruitment 2026 for ${overrides.vacancies ?? 50} Posts`,
    text: [`Organization Name : ${slug} Board`, `Advt. No. : ${slug.toUpperCase()}/2026/01`, `Last Date to Apply Online : ${overrides.lastDate ?? "30/12/2099"}`, `Total Vacancy : ${overrides.vacancies ?? 50}`, "Qualification : Any Graduate"].join("\n"),
    links: [{ href: `https://${slug}.gov.in/notice.pdf`, text: "Download Notification" }, { href: `https://${slug}.gov.in/apply`, text: "Apply Online" }],
    tables: [[["Post Name", "Vacancy"], ["Technical Assistant", String(overrides.vacancies ?? 50)]]]
  });

// Distinct names, because two near-identical headlines would be taken for the same notification.
const boards: Record<string, string> = { alpha: "Coal Mines Authority", bravo: "Textile Commission", oldie: "Salt Department", golf: "Harbour Trust" };
const posts: Record<string, string> = { alpha: "Pharmacist", bravo: "Welder", oldie: "Stenographer", golf: "Lab Attendant" };
const listingOf = (rows: Array<{ slug: string; date: string; last: string }>): CapturePayload => ({
  mode: "list",
  url: "https://rival-two.example/latest/",
  title: "Latest",
  text: "",
  tables: [],
  links: rows.map((row) => ({ href: `https://rival-two.example/${row.slug}`, text: "Get Details", context: `${row.date} | ${boards[row.slug] ?? row.slug} | ${posts[row.slug] ?? "Technical Assistant"} – 50 Posts | Any Graduate | – | ${row.last} | Get Details` }))
});

describe("one-click sync", () => {
  it("sorts a listing into new, headline-only, updated and unchanged, and skips what is older than the cut-off", async () => {
    const { planListing } = await import("@/lib/ingest/sync");
    const { ingestPage } = await import("@/lib/ingest/leads");
    const rows = [{ slug: "alpha", date: "01/11/2026", last: "30-12-2099" }, { slug: "bravo", date: "02/11/2026", last: "30-12-2099" }, { slug: "oldie", date: "01/03/2026", last: "01-04-2026" }];

    const first = await planListing(db, listingOf(rows), noToken, "2026-05-01");
    expect(first).toMatchObject({ spotted: 3, tooOld: 1, created: 2, unchanged: 0 });
    expect(first.todo.map((item) => [item.url.split("/").pop(), item.reason])).toEqual([["alpha", "new"], ["bravo", "new"]]);

    // Seen again before any page was read: still headlines only.
    expect((await planListing(db, listingOf(rows), noToken, "2026-05-01")).todo.map((item) => item.reason)).toEqual(["headline_only", "headline_only"]);

    await ingestPage(db, { ...fresh("alpha"), listingDate: "2026-11-01" }, noToken);
    const second = await planListing(db, listingOf(rows), noToken, "2026-05-01");
    expect(second.todo.map((item) => [item.url.split("/").pop(), item.reason])).toEqual([["bravo", "headline_only"]]);
    expect(second.unchanged).toBe(1);

    // The site shows a newer date for alpha: it was updated.
    const updated = await planListing(db, listingOf([{ ...rows[0], date: "05/11/2026" }]), noToken, "2026-05-01");
    expect(updated.todo.map((item) => item.reason)).toEqual(["updated_on_site"]);
  });

  it("tells a pending lead's changed last date apart, follows it, and keeps a value someone edited by hand", async () => {
    const { ingestPage, saveLead, getLead, fieldsOf } = await import("@/lib/ingest/leads");
    const first = await ingestPage(db, fresh("charlie"), noToken);
    expect(first.changes).toBeUndefined();

    const second = await ingestPage(db, fresh("charlie", { lastDate: "15/01/2100", vacancies: 80 }), noToken);
    expect(second.changes?.map((change) => [change.field, change.from, change.to])).toEqual([["applicationEndDate", "2099-12-30", "2100-01-15"], ["vacancyCount", "50", "80"]]);
    const followed = fieldsOf((await getLead(db, first.leadId))!.lead);
    expect(followed).toMatchObject({ applicationEndDate: "2100-01-15", vacancyCount: 80 });

    // Someone sets the vacancy count by hand; the source changes it again; their value stays and the change is flagged.
    await saveLead(db, first.leadId, { ...followed, vacancyCount: 75 }, adminId);
    const third = await ingestPage(db, fresh("charlie", { lastDate: "15/01/2100", vacancies: 90 }), noToken);
    expect(third.changes?.map((change) => change.field)).toEqual(["vacancyCount"]);
    const kept = await getLead(db, first.leadId);
    expect(fieldsOf(kept!.lead).vacancyCount).toBe(75);
    expect(kept!.lead.source_updates).toHaveLength(2);
  });

  it("flags a change to a published notification and applies it to the live recruitment only when asked", async () => {
    const { ingestPage, approveLead, getLead, fieldsOf } = await import("@/lib/ingest/leads");
    const { applySourceChanges, countUnseenUpdates } = await import("@/lib/ingest/sync");
    const first = await ingestPage(db, fresh("delta"), noToken);
    const { recruitmentId } = await approveLead(db, { id: first.leadId, actorId: adminId, mode: "publish", fields: fieldsOf((await getLead(db, first.leadId))!.lead), note: "Checked on delta.gov.in, all details match." });

    const again = await ingestPage(db, fresh("delta", { lastDate: "15/01/2100", vacancies: 60 }), noToken);
    expect(again.outcome).toBe("already_reviewed");
    expect(again.changes?.map((change) => change.field)).toEqual(["applicationEndDate", "vacancyCount"]);
    const before = await db.query<{ application_end_date: string; vacancy_total: number }>("select application_end_date::text, vacancy_total from recruitments where id = $1", [recruitmentId]);
    expect(before.rows[0]).toEqual({ application_end_date: "2099-12-30", vacancy_total: 50 });
    expect(await countUnseenUpdates(db)).toBeGreaterThanOrEqual(1);
    const { listLeads } = await import("@/lib/ingest/leads");
    expect((await listLeads(db, "updated")).some((lead) => lead.id === first.leadId && lead.updated_unseen)).toBe(true);

    const applied = await applySourceChanges(db, { id: first.leadId, actorId: adminId });
    expect(applied).toHaveLength(2);
    const after = await db.query<{ application_end_date: string; vacancy_total: number }>("select application_end_date::text, vacancy_total from recruitments where id = $1", [recruitmentId]);
    expect(after.rows[0]).toEqual({ application_end_date: "2100-01-15", vacancy_total: 60 });
    expect((await db.query<{ updates_seen_at: string | null }>("select updates_seen_at from notification_leads where id = $1", [first.leadId])).rows[0].updates_seen_at).not.toBeNull();
    expect((await listLeads(db, "updated")).some((lead) => lead.id === first.leadId)).toBe(false);
  });

  it("publishes many ready leads at once and reports the ones that are not ready", async () => {
    const { ingestPage } = await import("@/lib/ingest/leads");
    const { bulkPublish } = await import("@/lib/ingest/sync");
    const a = await ingestPage(db, fresh("echo"), noToken);
    const b = await ingestPage(db, fresh("foxtrot", { lastDate: "01/01/2020" }), noToken);
    const headline = await planListing2("golf");
    const result = await bulkPublish(db, { ids: [a.leadId, b.leadId, headline], actorId: adminId, note: "Archive batch checked against the official sites." });
    expect(result.published).toBe(2);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toMatch(/headline/i);
    expect(Number((await db.query<{ n: string }>("select count(*) as n from recruitments where title ilike '%foxtrot%' and editorial_status = 'published'")).rows[0].n)).toBe(1);
  });
});

// A headline-only lead, as a listing creates it.
async function planListing2(slug: string) {
  const { planListing } = await import("@/lib/ingest/sync");
  await planListing(db, listingOf([{ slug, date: "01/11/2026", last: "30-12-2099" }]), noToken);
  return (await db.query<{ lead_id: string }>("select lead_id from lead_sources where source_url = $1", [`https://rival-two.example/${slug}`])).rows[0].lead_id;
}
