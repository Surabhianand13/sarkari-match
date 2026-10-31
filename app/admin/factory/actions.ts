"use server";

import { adminDb, messageFrom } from "@/lib/admin/db";
import { writeAudit } from "@/lib/admin/audit";
import { integer, text } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { createBatch, type AiMode, type RunInput } from "@/lib/question-factory/engine";
import { providerStatus } from "@/lib/question-factory/providers";
import { MAX_TOPICS_PER_START, parseTopics } from "@/lib/question-factory/topics";

const BASE = "/admin/factory";

const MAX_BY_MODE: Record<AiMode, number> = { rules: 2000, queue: 500, api: 1000 };
export async function startFactoryRun(formData: FormData) {
  const admin = await requireAdmin();
  const mode = (["rules", "queue", "api"].includes(text(formData, "mode")) ? text(formData, "mode") : "queue") as AiMode;
  const difficulty = (["easy", "moderate", "hard"].includes(text(formData, "difficulty")) ? text(formData, "difficulty") : "mixed") as RunInput["difficulty"];
  const topics = parseTopics(String(formData.get("topic") ?? ""));
  if (topics.length > MAX_TOPICS_PER_START) goTo(withMessage(BASE, "error", `Start at most ${MAX_TOPICS_PER_START} topics at a time. You entered ${topics.length}.`));
  const base: RunInput = {
    exam: text(formData, "exam") || "SSC CGL",
    tier: text(formData, "tier") || "Tier I",
    subject: text(formData, "subject") || "Quantitative Aptitude",
    difficulty,
    count: Math.min(Math.max(integer(formData, "count") ?? 20, 1), MAX_BY_MODE[mode]),
    mode,
    provider: mode === "api" ? text(formData, "provider") || providerStatus().find((provider) => provider.ready)?.id : undefined,
    createdBy: admin.id
  };

  // One run per topic, each with the requested count, so every topic keeps its own questions and progress.
  const ids: string[] = [];
  try {
    const db = await adminDb();
    for (const topic of topics.length ? topics : [undefined]) {
      const input: RunInput = { ...base, topic };
      const id = await createBatch(db, input);
      ids.push(id);
      await writeAudit(db, { actorId: admin.id, action: "factory.run", entityType: "question_batch", entityId: id, after: input });
    }
  } catch (error) {
    const made = ids.length ? ` ${ids.length} run${ids.length === 1 ? " was" : "s were"} already started.` : "";
    goTo(withMessage(BASE, "error", `${messageFrom(error)}${made}`));
  }
  if (ids.length === 1) goTo(`${BASE}/${ids[0]}`);
  goTo(withMessage(BASE, "notice", `Started ${ids.length} runs, one per topic, ${base.count} questions each. Open each run to continue it.`));
}
