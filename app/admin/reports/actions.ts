"use server";

import { adminDb } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { optionalText, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";

export async function resolveReport(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const status = text(formData, "status") === "open" ? "open" : "resolved";
  const db = await adminDb();
  await db.query("update reports set status = $2, admin_notes = coalesce($3, admin_notes), updated_at = now() where id = $1", [id, status, optionalText(formData, "notes")]);
  await writeAudit(db, { actorId: admin.id, action: `report.${status}`, entityType: "report", entityId: id });
  goTo(withMessage("/admin/reports", "notice", `Report marked ${status}.`));
}
