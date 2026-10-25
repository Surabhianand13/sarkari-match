"use server";

import { adminDb, friendlyDbError } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { checkbox, decimal, integer, optionalText, rupeesToPaise, slugify, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";

const LIST = "/admin/tests";

export async function saveExam(formData: FormData) {
  const admin = await requireAdmin();
  const name = text(formData, "name");
  if (name.length < 2) goTo(withMessage(LIST, "error", "Enter an exam name."));
  const db = await adminDb();
  try {
    const created = await db.query<{ id: string }>("insert into exams (slug, name, description) values ($1,$2,$3) returning id", [slugify(text(formData, "slug") || name), name, optionalText(formData, "description")]);
    await writeAudit(db, { actorId: admin.id, action: "exam.create", entityType: "exam", entityId: created.rows[0].id, after: { name } });
  } catch (error) {
    goTo(withMessage(LIST, "error", friendlyDbError(error)));
  }
  revalidatePublicContent();
  goTo(withMessage(LIST, "notice", "Exam added."));
}

export async function saveSeries(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const title = text(formData, "title");
  const base = id ? `${LIST}/series/${id}` : `${LIST}/series/new`;
  const price = rupeesToPaise(formData, "price");
  const mrp = rupeesToPaise(formData, "mrp");
  if (title.length < 3 || !text(formData, "exam_id") || price === null || price < 0 || (mrp !== null && mrp < price)) {
    goTo(withMessage(base, "error", "Enter a title, pick an exam and a price. The original price (MRP) cannot be below the price."));
  }
  const values = [text(formData, "exam_id"), title, slugify(text(formData, "slug") || title), optionalText(formData, "description"), price, mrp];
  const db = await adminDb();
  let savedId = id;
  try {
    if (id) {
      await db.query("update test_series set exam_id=$1, title=$2, slug=$3, description=$4, price_paise=$5, mrp_paise=$6, updated_at=now() where id=$7", [...values, id]);
      await writeAudit(db, { actorId: admin.id, action: "series.update", entityType: "test_series", entityId: id, after: { title, price } });
    } else {
      const created = await db.query<{ id: string }>("insert into test_series (exam_id, title, slug, description, price_paise, mrp_paise) values ($1,$2,$3,$4,$5,$6) returning id", values);
      savedId = created.rows[0].id;
      await writeAudit(db, { actorId: admin.id, action: "series.create", entityType: "test_series", entityId: savedId, after: { title, price } });
    }
  } catch (error) {
    goTo(withMessage(base, "error", friendlyDbError(error)));
  }
  revalidatePublicContent();
  goTo(withMessage(`${LIST}/series/${savedId}`, "notice", "Series saved."));
}

export async function setSeriesStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const to = text(formData, "to");
  const base = `${LIST}/series/${id}`;
  if (!["draft", "published", "archived"].includes(to)) goTo(withMessage(base, "error", "Unknown status."));
  const db = await adminDb();
  if (to === "published") {
    const { rows } = await db.query<{ n: string }>("select count(*) as n from tests where series_id = $1 and status = 'published'", [id]);
    if (Number(rows[0].n) < 1) goTo(withMessage(base, "error", "Publish at least one test in this series first."));
  }
  await db.query("update test_series set status=$2, published_at = case when $2 = 'published' then coalesce(published_at, now()) else published_at end, updated_at=now() where id=$1", [id, to]);
  await writeAudit(db, { actorId: admin.id, action: `series.${to}`, entityType: "test_series", entityId: id });
  revalidatePublicContent();
  goTo(withMessage(base, "notice", `Series is now ${to}.`));
}

export async function saveTest(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const seriesId = text(formData, "series_id");
  const title = text(formData, "title");
  const base = id ? `${LIST}/test/${id}` : `${LIST}/series/${seriesId}`;
  const duration = integer(formData, "duration_minutes");
  const marks = decimal(formData, "default_marks");
  const negative = decimal(formData, "negative_marks");
  if (title.length < 3 || !duration || duration < 1 || marks === null || marks <= 0 || negative === null || negative < 0) {
    goTo(withMessage(base, "error", "Enter a title, a duration in minutes, marks per question and negative marks (0 or more)."));
  }
  const values = [seriesId, title, slugify(text(formData, "slug") || title), optionalText(formData, "instructions"), duration, marks, negative, checkbox(formData, "is_free_sample"), integer(formData, "position") ?? 0];
  const db = await adminDb();
  let savedId = id;
  try {
    if (id) {
      await db.query(
        "update tests set series_id=$1, title=$2, slug=$3, instructions=$4, duration_minutes=$5, default_marks=$6, negative_marks=$7, is_free_sample=$8, position=$9, updated_at=now() where id=$10",
        [...values, id]
      );
    } else {
      const created = await db.query<{ id: string }>(
        "insert into tests (series_id, title, slug, instructions, duration_minutes, default_marks, negative_marks, is_free_sample, position) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
        values
      );
      savedId = created.rows[0].id;
    }
    await writeAudit(db, { actorId: admin.id, action: id ? "test.update" : "test.create", entityType: "test", entityId: savedId, after: { title } });
  } catch (error) {
    goTo(withMessage(base, "error", friendlyDbError(error)));
  }
  revalidatePublicContent();
  goTo(withMessage(`${LIST}/test/${savedId}`, "notice", "Test saved."));
}

export async function setTestStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const to = text(formData, "to");
  const base = `${LIST}/test/${id}`;
  if (!["draft", "published", "archived"].includes(to)) goTo(withMessage(base, "error", "Unknown status."));
  const db = await adminDb();
  if (to === "published") {
    const { rows } = await db.query<{ total: string; unpublished: string }>(
      `select count(*) as total, count(*) filter (where q.validation_status <> 'published') as unpublished
       from test_questions tq join questions q on q.id = tq.question_id where tq.test_id = $1`,
      [id]
    );
    if (Number(rows[0].total) < 1) goTo(withMessage(base, "error", "Attach questions before publishing."));
    if (Number(rows[0].unpublished) > 0) goTo(withMessage(base, "error", "Every attached question must be published in the question bank first."));
  }
  await db.query("update tests set status=$2, published_at = case when $2 = 'published' then coalesce(published_at, now()) else published_at end, updated_at=now() where id=$1", [id, to]);
  await writeAudit(db, { actorId: admin.id, action: `test.${to}`, entityType: "test", entityId: id });
  revalidatePublicContent();
  goTo(withMessage(base, "notice", `Test is now ${to}.`));
}

export async function addSection(formData: FormData) {
  await requireAdmin();
  const testId = text(formData, "test_id");
  const name = text(formData, "name");
  const base = `${LIST}/test/${testId}`;
  if (name.length < 2) goTo(withMessage(base, "error", "Enter a section name."));
  const db = await adminDb();
  await db.query("insert into test_sections (test_id, name, position) values ($1, $2, coalesce((select max(position) + 1 from test_sections where test_id = $1), 0))", [testId, name]);
  goTo(withMessage(base, "notice", "Section added."));
}

export async function deleteSection(formData: FormData) {
  await requireAdmin();
  const testId = text(formData, "test_id");
  const db = await adminDb();
  await db.query("delete from test_sections where id = $1 and test_id = $2", [text(formData, "section_id"), testId]);
  goTo(withMessage(`${LIST}/test/${testId}`, "notice", "Section removed."));
}

export async function attachQuestions(formData: FormData) {
  const admin = await requireAdmin();
  const testId = text(formData, "test_id");
  const base = `${LIST}/test/${testId}`;
  const ids = formData.getAll("question_id").map(String);
  if (!ids.length) goTo(withMessage(base, "error", "Select at least one question."));
  const sectionId = optionalText(formData, "section_id");
  const db = await adminDb();
  await db.transaction(async (tx) => {
    for (const questionId of ids) {
      await tx.query(
        `insert into test_questions (test_id, question_id, section_id, position)
         select $1, q.id, $3, coalesce((select max(position) + 1 from test_questions where test_id = $1), 0)
         from questions q where q.id = $2 and q.validation_status in ('approved', 'published')
         on conflict do nothing`,
        [testId, questionId, sectionId]
      );
    }
    await writeAudit(tx, { actorId: admin.id, action: "test.attach_questions", entityType: "test", entityId: testId, after: { count: ids.length } });
  });
  goTo(withMessage(base, "notice", "Questions added."));
}

export async function detachQuestion(formData: FormData) {
  await requireAdmin();
  const testId = text(formData, "test_id");
  const db = await adminDb();
  await db.query("delete from test_questions where test_id = $1 and question_id = $2", [testId, text(formData, "question_id")]);
  goTo(withMessage(`${LIST}/test/${testId}`, "notice", "Question removed."));
}
