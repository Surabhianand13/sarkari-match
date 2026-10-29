"use server";

import { adminDb, messageFrom } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { integer, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { createBatch, type AiMode, type RunInput } from "@/lib/question-factory/engine";
import { providerStatus } from "@/lib/question-factory/providers";

const BASE = "/admin/factory";

const MAX_BY_MODE: Record<AiMode, number> = { rules: 2000, queue: 500, api: 1000 };

export async function startFactoryRun(formData: FormData) {
  const admin = await requireAdmin();
  const mode = (["rules", "queue", "api"].includes(text(formData, "mode")) ? text(formData, "mode") : "queue") as AiMode;
  const difficulty = (["easy", "moderate", "hard"].includes(text(formData, "difficulty")) ? text(formData, "difficulty") : "mixed") as RunInput["difficulty"];
  const input: RunInput = {
    exam: text(formData, "exam") || "SSC CGL",
    tier: text(formData, "tier") || "Tier I",
    subject: text(formData, "subject") || "Quantitative Aptitude",
    topic: text(formData, "topic") || undefined,
    difficulty,
    count: Math.min(Math.max(integer(formData, "count") ?? 20, 1), MAX_BY_MODE[mode]),
    mode,
    provider: mode === "api" ? text(formData, "provider") || providerStatus().find((provider) => provider.ready)?.id : undefined,
    createdBy: admin.id
  };

  let id: string;
  try {
    const db = await adminDb();
    id = await createBatch(db, input);
    await writeAudit(db, { actorId: admin.id, action: "factory.run", entityType: "question_batch", entityId: id, after: input });
  } catch (error) {
    goTo(withMessage(BASE, "error", messageFrom(error)));
  }
  goTo(`${BASE}/${id!}`);
}
