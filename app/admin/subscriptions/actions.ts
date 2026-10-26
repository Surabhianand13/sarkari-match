"use server";

import { adminDb } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { optionalText, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { normalizeEmail } from "@/lib/auth/users";
import { grantGuide, grantPass } from "@/lib/offers";

const BASE = "/admin/subscriptions";

async function findUser(email: string) {
  const db = await adminDb();
  const user = (await db.query<{ id: string }>("select id from users where lower(email) = $1", [normalizeEmail(email)])).rows[0];
  if (!user) goTo(withMessage(BASE, "error", "No account with that email. Ask the learner to sign up first."));
  return { db, userId: user!.id };
}

// A blank end date means the exam's own validity (12 months unless the exam says otherwise).
export async function grantAccess(formData: FormData) {
  const admin = await requireAdmin();
  const email = normalizeEmail(text(formData, "email"));
  const seriesId = text(formData, "series_id");
  const expires = optionalText(formData, "expires_at");
  const { db, userId } = await findUser(email);
  const result = await grantPass(db, { userId, seriesId, source: "grant", expiresAt: expires ? new Date(expires).toISOString() : null });
  await writeAudit(db, { actorId: admin.id, action: "access.grant", entityType: "test_series", entityId: seriesId, after: { email, granted: result.granted } });
  goTo(withMessage(BASE, "notice", result.granted ? `Pass granted to ${email}.` : `${email} already has access.`));
}

export async function grantGuideAccess(formData: FormData) {
  const admin = await requireAdmin();
  const email = normalizeEmail(text(formData, "email"));
  const examId = text(formData, "exam_id");
  const expires = optionalText(formData, "expires_at");
  const { db, userId } = await findUser(email);
  const result = await grantGuide(db, { userId, examId, source: "grant", expiresAt: expires ? new Date(expires).toISOString() : null });
  await writeAudit(db, { actorId: admin.id, action: "guide.grant", entityType: "exam", entityId: examId, after: { email, granted: result.granted } });
  goTo(withMessage(BASE, "notice", result.granted ? `AI Study Guide granted to ${email}.` : `${email} already has an active AI Study Guide for that exam.`));
}
