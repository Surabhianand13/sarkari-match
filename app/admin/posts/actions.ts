"use server";

import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { checkbox, integer, optionalText, slugify, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";
import { parsePostRules } from "@/lib/matching/rules-schema";

const applicationStatuses = ["open", "closed", "upcoming"];

export async function savePost(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const title = text(formData, "title");
  const recruitmentId = text(formData, "recruitment_id");
  const base = id ? `/admin/posts/${id}` : `/admin/posts/new?recruitment=${recruitmentId}`;

  const status = text(formData, "application_status");
  if (title.length < 3 || !recruitmentId || !applicationStatuses.includes(status)) goTo(withMessage(base, "error", "Choose a recruitment, enter a title and pick an application status."));
  const rules = parsePostRules(text(formData, "eligibility_rules"));
  if (!rules.ok) goTo(withMessage(base, "error", rules.message));

  const publish = checkbox(formData, "publish");
  const values = [
    recruitmentId,
    title,
    slugify(text(formData, "slug") || title),
    optionalText(formData, "post_code"),
    optionalText(formData, "description"),
    integer(formData, "vacancy_count"),
    optionalText(formData, "salary_text"),
    status,
    JSON.stringify(rules.ok ? rules.rules : {}),
    publish
  ];

  const db = await adminDb();
  let savedId = id;
  try {
    if (id) {
      const before = await db.query("select title, active, published_at, eligibility_rules from job_posts where id = $1", [id]);
      await db.query(
        `update job_posts set recruitment_id=$1, title=$2, slug=$3, post_code=$4, description=$5, vacancy_count=$6, salary_text=$7,
           application_status=$8, eligibility_rules=$9, active=$10, published_at = case when $10 then coalesce(published_at, now()) else published_at end, updated_at=now()
         where id=$11`,
        [...values, id]
      );
      await writeAudit(db, { actorId: admin.id, action: publish ? "post.save_live" : "post.save", entityType: "job_post", entityId: id, before: before.rows[0], after: { title, active: publish } });
    } else {
      const created = await db.query<{ id: string }>(
        `insert into job_posts (recruitment_id, title, slug, post_code, description, vacancy_count, salary_text, application_status, eligibility_rules, active, published_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, case when $10 then now() else null end) returning id`,
        values
      );
      savedId = created.rows[0].id;
      await writeAudit(db, { actorId: admin.id, action: "post.create", entityType: "job_post", entityId: savedId, after: { title, active: publish } });
    }
  } catch (error) {
    goTo(withMessage(base, "error", friendlyDbError(error)));
  }
  revalidatePublicContent();
  goTo(withMessage(`/admin/posts/${savedId}`, "notice", publish ? "Saved. The post goes live once its recruitment is published." : "Saved as draft."));
}
