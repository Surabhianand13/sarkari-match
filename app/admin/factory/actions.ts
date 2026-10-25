"use server";

import { adminDb, messageFrom } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { integer, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { createProvider } from "@/lib/question-factory/providers";
import { runBatch, type FactoryInput } from "@/lib/question-factory/pipeline";

const BASE = "/admin/factory";

export async function runFactoryBatch(formData: FormData) {
  const admin = await requireAdmin();
  const strategy = text(formData, "strategy") === "llm" ? "llm" : "template";
  const count = Math.min(Math.max(integer(formData, "count") ?? 20, 1), strategy === "template" ? 300 : 25);
  const subject = text(formData, "subject") || "Quantitative Aptitude";
  const input: FactoryInput = {
    exam: text(formData, "exam") || "SSC CGL",
    tier: text(formData, "tier") || "Tier I",
    subject,
    topic: text(formData, "topic") || undefined,
    difficulty: (["easy", "moderate", "hard"].includes(text(formData, "difficulty")) ? text(formData, "difficulty") : "mixed") as FactoryInput["difficulty"],
    count,
    strategy,
    createdBy: admin.id
  };

  try {
    const db = await adminDb();
    const generatorId = text(formData, "generator");
    const solverId = text(formData, "solver");
    const summary = await runBatch(input, {
      db,
      generator: strategy === "llm" && generatorId ? createProvider(generatorId) : undefined,
      solver: solverId ? createProvider(solverId) : undefined
    });
    await writeAudit(db, { actorId: admin.id, action: "factory.batch", entityType: "question_batch", entityId: summary.batchId, after: summary });
    const parts = [`${summary.stored} questions created`, `${summary.autoPassed} passed checks`, `${summary.needsReview} need review`, `${summary.autoFailed} failed checks`, `${summary.duplicates} duplicates skipped`];
    goTo(withMessage(BASE, summary.errors.length && !summary.stored ? "error" : "notice", `${parts.join(", ")}.${summary.errors[0] ? ` First problem: ${summary.errors[0]}` : ""}`));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    goTo(withMessage(BASE, "error", messageFrom(error)));
  }
}
