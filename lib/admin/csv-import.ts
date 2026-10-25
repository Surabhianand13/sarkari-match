import type { Db } from "@/lib/db";
import { slugify } from "@/lib/admin/forms";
import { writeAudit } from "@/lib/admin/audit";
import { normalizeQualificationLevel } from "@/lib/matching/profile";
import type { recruitmentCsvRowSchema } from "@/lib/import/csv";
import type { z } from "zod";

type Row = z.infer<typeof recruitmentCsvRowSchema>;

export type ImportResult = { created: number; skipped: Array<{ row: number; reason: string }> };

// Imported rows always land as drafts: the recruitment is "draft" and the post is not live.
export async function importRecruitmentRows(db: Db, rows: Row[], actorId: string): Promise<ImportResult> {
  const result: ImportResult = { created: 0, skipped: [] };

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    try {
      await db.transaction(async (tx) => {
        const state = await tx.query<{ id: string }>("select id from states where lower(name) = lower($1) or slug = $2 limit 1", [row.state, slugify(row.state)]);
        const orgSlug = slugify(row.organisation);
        const org = await tx.query<{ id: string }>(
          `insert into organisations (name, slug, state_id) values ($1, $2, $3)
           on conflict (slug) do update set name = organisations.name returning id`,
          [row.organisation, orgSlug, state.rows[0]?.id ?? null]
        );

        const recruitmentSlug = slugify(`${row.recruitment_title}-${row.application_end_date}`);
        const recruitment = await tx.query<{ id: string }>(
          `insert into recruitments (organisation_id, title, slug, application_end_date, official_notification_url, official_application_url)
           values ($1, $2, $3, $4, $5, $6) on conflict (slug) do nothing returning id`,
          [org.rows[0].id, row.recruitment_title, recruitmentSlug, row.application_end_date, row.official_notification_url, row.official_application_url]
        );
        const recruitmentId = recruitment.rows[0]?.id ?? (await tx.query<{ id: string }>("select id from recruitments where slug = $1", [recruitmentSlug])).rows[0].id;

        const level = normalizeQualificationLevel(row.qualification);
        const rules = level
          ? { qualificationRules: [{ minimumLevel: level, mandatory: true, acceptedAnyDegree: true, ruleText: `${row.qualification} qualification as per the official notification.` }] }
          : {};
        const post = await tx.query<{ id: string }>(
          `insert into job_posts (recruitment_id, title, slug, vacancy_count, application_status, eligibility_rules, active)
           values ($1, $2, $3, $4, 'open', $5, false) on conflict (slug) do nothing returning id`,
          [recruitmentId, row.post_title, slugify(`${row.post_title}-${recruitmentSlug}`), row.vacancy_count ?? null, JSON.stringify(rules)]
        );
        if (!post.rows[0]) throw new Error("A post with the same title and recruitment already exists.");
        await writeAudit(tx, { actorId, action: "import.row", entityType: "job_post", entityId: post.rows[0].id, after: { title: row.post_title, organisation: row.organisation } });
      });
      result.created++;
    } catch (error) {
      result.skipped.push({ row: rowNumber, reason: error instanceof Error ? error.message : "Could not import this row." });
    }
  }
  return result;
}
