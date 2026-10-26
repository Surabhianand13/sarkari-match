"use server";

import { adminDb } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { optionalText, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { normalizeEmail } from "@/lib/auth/users";
import { grantSeriesAccess } from "@/lib/tests/access";

const BASE = "/admin/subscriptions";

export async function grantAccess(formData: FormData) {
  const admin = await requireAdmin();
  const email = normalizeEmail(text(formData, "email"));
  const seriesId = text(formData, "series_id");
  const expires = optionalText(formData, "expires_at");
  const db = await adminDb();
  const user = (await db.query<{ id: string }>("select id from users where lower(email) = $1", [email])).rows[0];
  if (!user) goTo(withMessage(BASE, "error", "No account with that email. Ask the learner to sign up first."));
  const result = await grantSeriesAccess(db, { userId: user!.id, seriesId, source: "grant", expiresAt: expires ? new Date(expires).toISOString() : null });
  await writeAudit(db, { actorId: admin.id, action: "access.grant", entityType: "test_series", entityId: seriesId, after: { email, granted: result.granted } });
  goTo(withMessage(BASE, "notice", result.granted ? `Access granted to ${email}.` : `${email} already has access.`));
}
