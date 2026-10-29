"use server";

import { adminDb, messageFrom } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { addSource, deleteSource, extractPdfText, sourceKinds, type SourceKind } from "@/lib/question-factory/knowledge";

const BASE = "/admin/factory/sources";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function addSourceAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const kind = text(formData, "kind") as SourceKind;
    if (!sourceKinds.includes(kind)) throw new Error("Choose what kind of material this is.");
    const title = text(formData, "title");
    if (!title) throw new Error("Give it a short title, for example 'SSC CGL 2024 Tier I syllabus'.");

    const file = formData.get("file");
    let body = text(formData, "body");
    let fileName: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) throw new Error("That file is over 8 MB. Split it or paste the text.");
      fileName = file.name;
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      body = isPdf ? await extractPdfText(new Uint8Array(await file.arrayBuffer())) : await file.text();
    }
    const db = await adminDb();
    const id = await addSource(db, { exam: text(formData, "exam") || "SSC CGL", subject: text(formData, "subject"), topic: text(formData, "topic"), kind, title, body: body.slice(0, 400_000), fileName, asOf: text(formData, "as_of"), createdBy: admin.id });
    await writeAudit(db, { actorId: admin.id, action: "factory.source.add", entityType: "knowledge_source", entityId: id, after: { kind, title, fileName } });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    goTo(withMessage(BASE, "error", messageFrom(error)));
  }
  goTo(withMessage(BASE, "notice", "Source added. New runs will use it."));
}

export async function deleteSourceAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = text(formData, "id");
  const db = await adminDb();
  await deleteSource(db, id);
  await writeAudit(db, { actorId: admin.id, action: "factory.source.delete", entityType: "knowledge_source", entityId: id });
  goTo(withMessage(BASE, "notice", "Source removed."));
}
