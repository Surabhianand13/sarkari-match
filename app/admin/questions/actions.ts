"use server";

import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { optionalText, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { canTransition, contentHash, questionDraftSchema, validationStatuses, type ValidationStatus } from "@/lib/tests/question-schema";

const LIST = "/admin/questions";

function draftFromForm(formData: FormData) {
  return {
    exam: text(formData, "exam") || "General",
    tier: optionalText(formData, "tier") ?? undefined,
    subject: text(formData, "subject"),
    topic: text(formData, "topic"),
    difficulty: text(formData, "difficulty"),
    question: text(formData, "question"),
    options: { A: text(formData, "option_A"), B: text(formData, "option_B"), C: text(formData, "option_C"), D: text(formData, "option_D") },
    correct_answer: text(formData, "correct_answer"),
    explanation: text(formData, "explanation"),
    estimated_time_seconds: Number(text(formData, "est_time_seconds")) || 60,
    source_type: "human_authored"
  };
}

export async function saveQuestion(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const base = id ? `${LIST}/${id}` : `${LIST}/new`;
  const parsed = questionDraftSchema.safeParse(draftFromForm(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    goTo(withMessage(base, "error", `${issue.path.join(".") || "question"}: ${issue.message}`));
  }
  const draft = parsed.data!;
  const hash = contentHash(draft);
  const db = await adminDb();
  let savedId = id;
  try {
    if (id) {
      const before = await db.query<{ validation_status: ValidationStatus; stem: string }>("select validation_status, stem from questions where id = $1", [id]);
      if (!before.rows[0]) goTo(withMessage(LIST, "error", "Question not found."));
      // Any edit sends an approved or published question back for a fresh human check.
      const reopen = ["approved", "published"].includes(before.rows[0].validation_status);
      if (reopen) {
        const live = await db.query("select 1 from test_questions tq join tests t on t.id = tq.test_id where tq.question_id = $1 and t.status = 'published' limit 1", [id]);
        if (live.rowCount) goTo(withMessage(base, "error", "This question is in a published test. Remove it from the test before editing."));
      }
      await db.query(
        `update questions set tier=$1, subject=$2, topic=$3, difficulty=$4, stem=$5, options=$6, correct_option=$7, explanation=$8, est_time_seconds=$9,
           content_hash=$10, validation_status = case when $11 then 'needs_review' else validation_status end, updated_at=now() where id=$12`,
        [draft.tier ?? null, draft.subject, draft.topic, draft.difficulty, draft.question, JSON.stringify(draft.options), draft.correct_answer, draft.explanation, draft.estimated_time_seconds, hash, reopen, id]
      );
      await writeAudit(db, { actorId: admin.id, action: "question.update", entityType: "question", entityId: id, before: before.rows[0], after: { stem: draft.question } });
    } else {
      const exam = await db.query<{ id: string }>("select id from exams where name ilike $1 or slug = $1 limit 1", [draft.exam]);
      const created = await db.query<{ id: string }>(
        `insert into questions (exam_id, tier, subject, topic, difficulty, stem, options, correct_option, explanation, est_time_seconds, source_type, validation_status, content_hash, reviewed_by, reviewed_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'human_authored','approved',$11,$12, now()) returning id`,
        [exam.rows[0]?.id ?? null, draft.tier ?? null, draft.subject, draft.topic, draft.difficulty, draft.question, JSON.stringify(draft.options), draft.correct_answer, draft.explanation, draft.estimated_time_seconds, hash, admin.id]
      );
      savedId = created.rows[0].id;
      await writeAudit(db, { actorId: admin.id, action: "question.create", entityType: "question", entityId: savedId, after: { stem: draft.question } });
    }
  } catch (error) {
    goTo(withMessage(base, "error", friendlyDbError(error).replace("That slug or value", "That question")));
  }
  goTo(withMessage(`${LIST}/${savedId}`, "notice", "Question saved."));
}

async function transition(db: Awaited<ReturnType<typeof adminDb>>, adminId: string, id: string, to: ValidationStatus, note?: string) {
  const { rows } = await db.query<{ validation_status: ValidationStatus }>("select validation_status from questions where id = $1", [id]);
  const from = rows[0]?.validation_status;
  if (!from) return "Question not found.";
  if (!canTransition(from, to)) return `Cannot move a ${from.replace("_", " ")} question to ${to.replace("_", " ")}.`;
  if (["rejected", "needs_review"].includes(to) || (from === "published" && to === "approved")) {
    const live = await db.query("select 1 from test_questions tq join tests t on t.id = tq.test_id where tq.question_id = $1 and t.status = 'published' limit 1", [id]);
    if (live.rowCount) return "This question is in a published test. Remove it from the test first.";
  }
  await db.query(
    `update questions set validation_status=$2, reviewed_by=$3, reviewed_at=now(),
       validation_notes = validation_notes || jsonb_build_object('review_note', $4::text), updated_at=now() where id=$1`,
    [id, to, adminId, note ?? null]
  );
  await writeAudit(db, { actorId: adminId, action: `question.${to}`, entityType: "question", entityId: id, before: { status: from }, after: { status: to, note } });
  return null;
}

export async function setQuestionStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const to = text(formData, "to") as ValidationStatus;
  if (!validationStatuses.includes(to)) goTo(withMessage(`${LIST}/${id}`, "error", "Unknown status."));
  const db = await adminDb();
  const problem = await transition(db, admin.id, id, to, optionalText(formData, "note") ?? undefined);
  goTo(problem ? withMessage(`${LIST}/${id}`, "error", problem) : withMessage(`${LIST}/${id}`, "notice", `Question is now ${to.replace("_", " ")}.`));
}

export async function bulkSetQuestionStatus(formData: FormData) {
  const admin = await requireAdmin();
  const ids = formData.getAll("question_id").map(String);
  const to = text(formData, "to") as ValidationStatus;
  const back = text(formData, "back") || LIST;
  if (!ids.length) goTo(withMessage(back, "error", "Select at least one question."));
  if (!["approved", "rejected", "published"].includes(to)) goTo(withMessage(back, "error", "Bulk actions support approve, publish and reject."));
  const db = await adminDb();
  let done = 0;
  const problems: string[] = [];
  for (const id of ids) {
    const problem = await transition(db, admin.id, id, to);
    if (problem) problems.push(problem);
    else done++;
  }
  goTo(withMessage(back, problems.length ? "error" : "notice", problems.length ? `${done} updated, ${problems.length} skipped: ${problems[0]}` : `${done} questions ${to}.`));
}
