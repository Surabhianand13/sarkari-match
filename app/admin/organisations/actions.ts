"use server";

import { z } from "zod";
import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { goTo, withMessage } from "@/lib/admin/nav";
import { checkbox, optionalText, slugify, text } from "@/lib/admin/forms";
import { revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";

const schema = z.object({
  name: z.string().min(2).max(160),
  website: z.string().url().nullable()
});

export async function saveOrganisation(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const name = text(formData, "name");
  const website = optionalText(formData, "official_website");
  const parsed = schema.safeParse({ name, website });
  const base = id ? `/admin/organisations/${id}` : "/admin/organisations";
  if (!parsed.success) goTo(withMessage(base, "error", "Enter a name (2+ characters) and a valid website URL, or leave the website empty."));

  const values = [
    name,
    slugify(text(formData, "slug") || name),
    optionalText(formData, "short_name"),
    optionalText(formData, "organisation_type"),
    optionalText(formData, "department_id"),
    optionalText(formData, "state_id"),
    website,
    optionalText(formData, "description"),
    checkbox(formData, "active")
  ];

  const db = await adminDb();
  try {
    if (id) {
      const before = await db.query("select * from organisations where id = $1", [id]);
      await db.query(
        `update organisations set name=$1, slug=$2, short_name=$3, organisation_type=$4, department_id=$5, state_id=$6,
           official_website=$7, description=$8, active=$9, updated_at=now() where id=$10`,
        [...values, id]
      );
      await writeAudit(db, { actorId: admin.id, action: "organisation.update", entityType: "organisation", entityId: id, before: before.rows[0], after: { name, active: values[8] } });
    } else {
      const created = await db.query<{ id: string }>(
        `insert into organisations (name, slug, short_name, organisation_type, department_id, state_id, official_website, description, active)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
        values
      );
      await writeAudit(db, { actorId: admin.id, action: "organisation.create", entityType: "organisation", entityId: created.rows[0].id, after: { name } });
    }
  } catch (error) {
    goTo(withMessage(base, "error", friendlyDbError(error)));
  }
  revalidatePublicContent();
  goTo(withMessage("/admin/organisations", "notice", "Organisation saved."));
}
