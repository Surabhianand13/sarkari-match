import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseRecruitmentCsv, recruitmentCsvTemplate } from "@/lib/import/csv";

process.env.DATABASE_URL = "pglite://memory://";

beforeAll(async () => {
  const { getDb } = await import("@/lib/db");
  const db = (await getDb())!;
  for (const dir of ["db/migrations", "db/seed"]) for (const file of readdirSync(join(process.cwd(), dir)).sort()) await db.exec(readFileSync(join(process.cwd(), dir, file), "utf8"));
});

const csv = [
  recruitmentCsvTemplate,
  "Demo Bank Board,Demo Bank Clerk 2026,Clerk,Graduate,Karnataka,2026-12-01,https://example.com/n.pdf,https://example.com/a,500",
  "Demo Bank Board,Demo Bank Clerk 2026,Clerk,Graduate,Karnataka,2026-12-01,https://example.com/n.pdf,https://example.com/a,500",
  "Bad Row,,Clerk,Graduate,Karnataka,not-a-date,nope,nope,1"
].join("\n");

describe("admin CSV import", () => {
  it("creates drafts only, skips duplicates and bad rows, and never publishes", async () => {
    const { getDb } = await import("@/lib/db");
    const { importRecruitmentRows } = await import("@/lib/admin/csv-import");
    const db = (await getDb())!;
    const parsed = parseRecruitmentCsv(csv);
    expect(parsed.validRows).toHaveLength(2);
    expect(parsed.errors).toHaveLength(1);

    const result = await importRecruitmentRows(db, parsed.validRows, "00000000-0000-4000-8000-000000000001");
    expect(result.created).toBe(1);
    expect(result.skipped).toHaveLength(1);

    const post = await db.query<{ active: boolean; published_at: string | null; editorial_status: string; rules: { qualificationRules?: Array<{ minimumLevel: string }> } }>(
      `select jp.active, jp.published_at, r.editorial_status, jp.eligibility_rules as rules from job_posts jp join recruitments r on r.id = jp.recruitment_id where jp.title = 'Clerk'`
    );
    expect(post.rows[0]).toMatchObject({ active: false, published_at: null, editorial_status: "draft" });
    expect(post.rows[0].rules.qualificationRules?.[0].minimumLevel).toBe("graduate");

    const { getJobs } = await import("@/lib/data/jobs");
    expect((await getJobs()).some((job) => job.title === "Clerk")).toBe(false);
  });
});

describe("admin statistics", () => {
  it("counts live notifications, drafts and the review queue", async () => {
    const { getAdminStats } = await import("@/lib/admin/stats");
    const stats = await getAdminStats();
    expect(stats?.publishedNotifications).toBe(3);
    expect(stats?.draftRecruitments).toBeGreaterThanOrEqual(1);
    expect(stats?.questionsAwaitingReview).toBe(0);
  });
});
