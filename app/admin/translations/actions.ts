"use server";

import { adminDb } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { toQuestionSet } from "@/lib/question-sets";
import { setTranslationProblem, translationProblem } from "@/lib/translation";
import { optionKeys } from "@/lib/tests/question-schema";

const LIST = "/admin/translations";

type Db = Awaited<ReturnType<typeof adminDb>>;

// Re-runs every check on the stored Hindi against the English, so nothing is approved that a person edited into a mistake.
async function questionProblem(db: Db, questionId: string): Promise<string | null> {
  const row = (await db.query<{ stem: string; options: Record<string, string>; explanation: string; correct_option: string; h_stem: string; h_options: Record<string, string>; h_explanation: string }>(
    `select q.stem, q.options, q.explanation, q.correct_option, t.stem as h_stem, t.options as h_options, t.explanation as h_explanation
       from question_translations t join questions q on q.id = t.question_id where t.question_id = $1 and t.lang = 'hi'`, [questionId])).rows[0];
  if (!row) return "There is no Hindi version of this question.";
  return translationProblem({ stem: row.stem, options: row.options, explanation: row.explanation, correct: row.correct_option }, { stem: row.h_stem, options: row.h_options, explanation: row.h_explanation });
}

async function setProblem(db: Db, setId: string): Promise<string | null> {
  const row = (await db.query<{ title: string; stimulus: string; chart: unknown; kind: string; h_title: string; h_stimulus: string; h_chart: unknown }>(
    `select s.title, s.stimulus, s.chart, s.kind, t.title as h_title, t.stimulus as h_stimulus, t.chart as h_chart
       from set_translations t join question_sets s on s.id = t.set_id where t.set_id = $1 and t.lang = 'hi'`, [setId])).rows[0];
  if (!row) return "There is no Hindi version of this data.";
  const english = toQuestionSet({ id: setId, title: row.title, stimulus: row.stimulus, chart: row.chart, kind: row.kind });
  const result = setTranslationProblem({ title: english.title, stimulus: english.stimulus, chart: english.chart }, { title: row.h_title, stimulus: row.h_stimulus, chart: row.h_chart });
  return "error" in result ? result.error : null;
}

const decisions = ["approved", "rejected", "needs_review"] as const;
type Decision = (typeof decisions)[number];

// A person who reads Hindi has edited a translation. It is checked like a machine one and goes back to review.
export async function saveTranslation(formData: FormData) {
  const admin = await requireAdmin();
  const questionId = text(formData, "question_id");
  const back = `/admin/questions/${questionId}`;
  const db = await adminDb();
  const stem = String(formData.get("stem") ?? "").trim();
  const explanation = String(formData.get("explanation") ?? "").trim();
  const options = Object.fromEntries(optionKeys.map((key) => [key, String(formData.get(`option_${key}`) ?? "").trim()]));
  const english = (await db.query<{ stem: string; options: Record<string, string>; explanation: string; correct_option: string }>("select stem, options, explanation, correct_option from questions where id = $1", [questionId])).rows[0];
  if (!english) goTo(withMessage(LIST, "error", "Question not found."));
  const problem = translationProblem({ stem: english.stem, options: english.options, explanation: english.explanation, correct: english.correct_option }, { stem, options, explanation });
  if (problem) goTo(withMessage(back, "error", `Not saved. ${problem}`));
  await db.query(
    `update question_translations set stem = $2, options = $3, explanation = $4, status = 'needs_review', reviewed_by = null, reviewed_at = null, updated_at = now() where question_id = $1 and lang = 'hi'`,
    [questionId, stem, JSON.stringify(options), explanation]
  );
  await writeAudit(db, { actorId: admin.id, action: "translation.edit", entityType: "question", entityId: questionId, after: { lang: "hi" } });
  goTo(withMessage(back, "notice", "Hindi version saved. It is back in review until you approve it."));
}

async function decideQuestion(db: Db, adminId: string, questionId: string, to: Decision): Promise<string | null> {
  if (to === "approved") {
    const problem = await questionProblem(db, questionId);
    if (problem) return problem;
  }
  const done = await db.query(
    "update question_translations set status = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now() where question_id = $1 and lang = 'hi' and status in ('needs_review', 'approved', 'rejected', 'failed')",
    [questionId, to, adminId]
  );
  if (!done.rowCount) return "This translation is still being written or checked.";
  await writeAudit(db, { actorId: adminId, action: `translation.${to}`, entityType: "question", entityId: questionId, after: { lang: "hi" } });
  return null;
}

async function decideSet(db: Db, adminId: string, setId: string, to: Decision): Promise<string | null> {
  if (to === "approved") {
    const problem = await setProblem(db, setId);
    if (problem) return problem;
  }
  const done = await db.query(
    "update set_translations set status = $2, reviewed_by = $3, reviewed_at = now(), updated_at = now() where set_id = $1 and lang = 'hi' and status in ('needs_review', 'approved', 'rejected', 'failed')",
    [setId, to, adminId]
  );
  if (!done.rowCount) return "This translation is still being written or checked.";
  await writeAudit(db, { actorId: adminId, action: `translation.set.${to}`, entityType: "question_set", entityId: setId, after: { lang: "hi" } });
  return null;
}

export async function setTranslationStatus(formData: FormData) {
  const admin = await requireAdmin();
  const questionId = text(formData, "question_id");
  const to = text(formData, "to") as Decision;
  const back = `/admin/questions/${questionId}`;
  if (!decisions.includes(to)) goTo(withMessage(back, "error", "Unknown decision."));
  const problem = await decideQuestion(await adminDb(), admin.id, questionId, to);
  goTo(problem ? withMessage(back, "error", problem) : withMessage(back, "notice", `Hindi version ${to.replace("_", " ")}.`));
}

export async function setSetTranslationStatus(formData: FormData) {
  const admin = await requireAdmin();
  const setId = text(formData, "set_id");
  const questionId = text(formData, "question_id");
  const to = text(formData, "to") as Decision;
  const back = `/admin/questions/${questionId}`;
  if (!decisions.includes(to)) goTo(withMessage(back, "error", "Unknown decision."));
  const problem = await decideSet(await adminDb(), admin.id, setId, to);
  goTo(problem ? withMessage(back, "error", problem) : withMessage(back, "notice", `Hindi version of the shared data ${to.replace("_", " ")}.`));
}

// Approve or reject many at once from the list, after the reader has looked through them.
export async function bulkTranslationStatus(formData: FormData) {
  const admin = await requireAdmin();
  const to = text(formData, "to") as Decision;
  const back = text(formData, "back") || LIST;
  if (!["approved", "rejected"].includes(to)) goTo(withMessage(back, "error", "Choose approve or reject."));
  const questions = formData.getAll("question_id").map(String);
  const sets = formData.getAll("set_id").map(String);
  if (!questions.length && !sets.length) goTo(withMessage(back, "error", "Select at least one translation."));
  const db = await adminDb();
  let done = 0;
  const problems: string[] = [];
  for (const id of sets) {
    const problem = await decideSet(db, admin.id, id, to);
    if (problem) problems.push(problem);
    else done++;
  }
  for (const id of questions) {
    const problem = await decideQuestion(db, admin.id, id, to);
    if (problem) problems.push(problem);
    else done++;
  }
  goTo(withMessage(back, problems.length ? "error" : "notice", problems.length ? `${done} updated, ${problems.length} skipped: ${problems[0]}` : `${done} translation${done === 1 ? "" : "s"} ${to}.`));
}
