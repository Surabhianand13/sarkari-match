"use server";

import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { checkbox, decimal, integer, optionalText, slugify, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";
import { patternSchema } from "@/lib/exams/pattern";

const BASE = "/admin/exams";

export async function createExam(formData: FormData) {
  const admin = await requireAdmin();
  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  if (!name || !slug) goTo(withMessage(`${BASE}/new`, "error", "Enter the exam name."));
  const db = await adminDb();
  let id = "";
  try {
    id = (await db.query<{ id: string }>("insert into exams (slug, name) values ($1,$2) returning id", [slug, name])).rows[0].id;
  } catch (error) {
    goTo(withMessage(`${BASE}/new`, "error", friendlyDbError(error)));
  }
  await writeAudit(db, { actorId: admin.id, action: "exam.create", entityType: "exam", entityId: id, after: { name, slug } });
  goTo(withMessage(`${BASE}/${id}`, "notice", "Exam created. Set its offer below."));
}

const rupeesToPaise = (value: number | null) => (value === null ? null : Math.round(value * 100));

// Sections are typed one per line as "Name | questions | marks".
function parseSections(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, questions, marks] = line.split("|").map((part) => part.trim());
    return { name, questions: Number(questions), marks: Number(marks) };
  });
}

export async function saveExam(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const back = `${BASE}/${id}`;
  const guideEnabled = checkbox(formData, "guide_enabled");
  const guidePrice = rupeesToPaise(decimal(formData, "guide_price"));
  const guideMrp = rupeesToPaise(decimal(formData, "guide_mrp"));
  if (guideEnabled && (guidePrice === null || guidePrice < 0)) goTo(withMessage(back, "error", "Enter the Guide price in rupees to turn the Guide on."));
  if (guideMrp !== null && guidePrice !== null && guideMrp < guidePrice) goTo(withMessage(back, "error", "The Guide MRP cannot be lower than its price."));

  let pattern: unknown = null;
  const questions = optionalText(formData, "pattern_questions");
  if (questions) {
    const parsed = patternSchema.safeParse({
      name: text(formData, "pattern_name"), questions: Number(questions), maxMarks: Number(text(formData, "pattern_marks")), minutes: Number(text(formData, "pattern_minutes")),
      marksPerQuestion: Number(text(formData, "pattern_marks_per_question")), negativeMarks: Number(text(formData, "pattern_negative") || 0), sections: parseSections(text(formData, "pattern_sections"))
    });
    if (!parsed.success) goTo(withMessage(back, "error", `The pattern is not valid: ${parsed.error.issues[0]?.path.join(".") || "check the numbers"}. Sections go one per line as Name | questions | marks.`));
    pattern = parsed.success ? parsed.data : null;
  }

  const db = await adminDb();
  try {
    await db.query("update exams set name = $2, active = $3, pattern = $4, updated_at = now() where id = $1", [id, text(formData, "name"), checkbox(formData, "active"), pattern === null ? null : JSON.stringify(pattern)]);
    await db.query(
      `insert into exam_offers (exam_id, pass_validity_days, second_exam_discount_percent, guide_enabled, guide_price_paise, guide_mrp_paise, guide_validity_days, ai_daily_fast_cap, ai_daily_deep_cap)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (exam_id) do update set pass_validity_days = excluded.pass_validity_days, second_exam_discount_percent = excluded.second_exam_discount_percent, guide_enabled = excluded.guide_enabled,
         guide_price_paise = excluded.guide_price_paise, guide_mrp_paise = excluded.guide_mrp_paise, guide_validity_days = excluded.guide_validity_days,
         ai_daily_fast_cap = excluded.ai_daily_fast_cap, ai_daily_deep_cap = excluded.ai_daily_deep_cap, updated_at = now()`,
      [id, integer(formData, "pass_validity_days") ?? 365, integer(formData, "second_exam_discount_percent") ?? 20, guideEnabled, guidePrice, guideMrp, integer(formData, "guide_validity_days") ?? 365, integer(formData, "ai_daily_fast_cap") ?? 30, integer(formData, "ai_daily_deep_cap") ?? 2]
    );
  } catch (error) {
    goTo(withMessage(back, "error", friendlyDbError(error)));
  }
  await writeAudit(db, { actorId: admin.id, action: "exam.update", entityType: "exam", entityId: id, after: { guideEnabled, guidePrice, hasPattern: pattern !== null } });
  revalidatePublicContent();
  goTo(withMessage(back, "notice", "Exam saved."));
}
