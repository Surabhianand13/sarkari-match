"use server";

import { z } from "zod";
import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { optionalText, slugify, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";

const statuses = ["draft", "needs_review", "reviewed", "published", "expired", "archived"] as const;
type EditorialStatus = (typeof statuses)[number];

const allowed: Record<EditorialStatus, EditorialStatus[]> = {
  draft: ["needs_review"],
  needs_review: ["reviewed", "draft"],
  reviewed: ["published", "draft"],
  published: ["draft", "expired", "archived"],
  expired: ["archived", "draft"],
  archived: ["draft"]
};

const urlOrNull = z.string().url().nullable();

export async function saveRecruitment(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const title = text(formData, "title");
  const base = id ? `/admin/recruitments/${id}` : "/admin/recruitments/new";

  const urls = [optionalText(formData, "official_notification_url"), optionalText(formData, "official_application_url"), optionalText(formData, "official_website_url")];
  if (title.length < 3 || !text(formData, "organisation_id") || !urls.every((url) => urlOrNull.safeParse(url).success)) {
    goTo(withMessage(base, "error", "Choose an organisation, enter a title and use valid https links."));
  }

  const values = [
    text(formData, "organisation_id"),
    title,
    slugify(text(formData, "slug") || title),
    optionalText(formData, "notification_number"),
    optionalText(formData, "notification_date"),
    optionalText(formData, "application_start_date"),
    optionalText(formData, "application_end_date"),
    ...urls,
    optionalText(formData, "summary"),
    optionalText(formData, "verification_notes")
  ];

  const db = await adminDb();
  let savedId = id;
  try {
    if (id) {
      const before = await db.query("select * from recruitments where id = $1", [id]);
      await db.query(
        `update recruitments set organisation_id=$1, title=$2, slug=$3, notification_number=$4, notification_date=$5, application_start_date=$6,
           application_end_date=$7, official_notification_url=$8, official_application_url=$9, official_website_url=$10, summary=$11,
           verification_notes=$12, updated_at=now() where id=$13`,
        [...values, id]
      );
      await writeAudit(db, { actorId: admin.id, action: "recruitment.update", entityType: "recruitment", entityId: id, before: before.rows[0], after: { title } });
    } else {
      const created = await db.query<{ id: string }>(
        `insert into recruitments (organisation_id, title, slug, notification_number, notification_date, application_start_date, application_end_date,
           official_notification_url, official_application_url, official_website_url, summary, verification_notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
        values
      );
      savedId = created.rows[0].id;
      await writeAudit(db, { actorId: admin.id, action: "recruitment.create", entityType: "recruitment", entityId: savedId, after: { title } });
    }
  } catch (error) {
    goTo(withMessage(base, "error", friendlyDbError(error)));
  }
  revalidatePublicContent();
  goTo(withMessage(`/admin/recruitments/${savedId}`, "notice", "Recruitment saved."));
}

export async function setRecruitmentStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const to = text(formData, "to") as EditorialStatus;
  const base = `/admin/recruitments/${id}`;
  if (!statuses.includes(to)) goTo(withMessage(base, "error", "Unknown status."));

  const db = await adminDb();
  const { rows } = await db.query<{ editorial_status: EditorialStatus; official_notification_url: string | null; official_application_url: string | null; application_end_date: string | null; verification_notes: string | null }>(
    "select editorial_status, official_notification_url, official_application_url, application_end_date::text, verification_notes from recruitments where id = $1",
    [id]
  );
  const current = rows[0];
  if (!current) goTo(withMessage("/admin/recruitments", "error", "Recruitment not found."));
  if (!allowed[current.editorial_status].includes(to)) goTo(withMessage(base, "error", `Cannot move from ${current.editorial_status} to ${to}.`));

  if (to === "published") {
    const missing = [!current.official_notification_url && "official notification link", !current.official_application_url && "official application link", !current.application_end_date && "last date", !current.verification_notes && "verification notes"].filter(Boolean);
    if (missing.length) goTo(withMessage(base, "error", `Before publishing add: ${missing.join(", ")}.`));
    await db.query(
      "update recruitments set editorial_status='published', status='published', verified_at=now(), verified_by=$2, published_at=coalesce(published_at, now()), updated_at=now() where id=$1",
      [id, admin.id]
    );
  } else {
    await db.query("update recruitments set editorial_status=$2::editorial_status, status=$2::text, updated_at=now() where id=$1", [id, to]);
  }
  await writeAudit(db, { actorId: admin.id, action: `recruitment.${to}`, entityType: "recruitment", entityId: id, before: { status: current.editorial_status }, after: { status: to } });
  revalidatePublicContent();
  goTo(withMessage(base, "notice", `Moved to ${to.replace("_", " ")}.`));
}
