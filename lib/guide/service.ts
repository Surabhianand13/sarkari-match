import { getDb } from "@/lib/db";
import { buildGuideInstructions, buildStudentContext } from "@/lib/guide/context";
import { getProvider, guideModels, type AiProvider } from "@/lib/ai/provider";
import { getExamOffer, hasGuideAccess, recordUsage, usageToday, type Tier } from "@/lib/offers";
import { getExam } from "@/lib/tests/catalog";

export type GuideResult =
  | { ok: true; reply: string; left: { fast: number; deep: number } }
  | { ok: false; reason: "not_found" | "no_access" | "cap_fast" | "cap_deep" | "unavailable" | "error"; left?: { fast: number; deep: number } };

export const MAX_MESSAGE_CHARS = 800;
const HISTORY_TURNS = 8;

export async function guideLimits(userId: string, examId: string) {
  const [offer, used] = await Promise.all([getExamOffer(examId), usageToday(userId, examId)]);
  return { fast: Math.max(0, offer.aiDailyFastCap - used.fast), deep: Math.max(0, offer.aiDailyDeepCap - used.deep) };
}

export async function getGuideHistory(userId: string, examId: string, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ id: string; role: "user" | "assistant"; content: string; tier: Tier | null }>(
    "select id, role, content, tier from guide_messages where user_id = $1 and exam_id = $2 order by seq desc limit $3", [userId, examId, limit]);
  return rows.reverse();
}

// One question to the Guide. Access, daily caps and usage recording are enforced here, so no caller can skip them.
export async function sendGuideMessage(input: { userId: string; examSlug: string; text: string; deep: boolean; provider?: AiProvider | null }): Promise<GuideResult> {
  const db = await getDb();
  const exam = await getExam(input.examSlug);
  if (!db || !exam) return { ok: false, reason: "not_found" };
  if (!(await hasGuideAccess(input.userId, exam.id, db))) return { ok: false, reason: "no_access" };

  const tier: Tier = input.deep ? "deep" : "fast";
  const left = await guideLimits(input.userId, exam.id);
  if (left[tier] <= 0) return { ok: false, reason: tier === "deep" ? "cap_deep" : "cap_fast", left };

  const provider = input.provider === undefined ? getProvider() : input.provider;
  if (!provider) return { ok: false, reason: "unavailable", left };

  const history = (await getGuideHistory(input.userId, exam.id, HISTORY_TURNS * 2)).map((message) => ({ role: message.role, content: message.content }));
  const text = input.text.trim().slice(0, MAX_MESSAGE_CHARS);
  const models = guideModels();
  try {
    const result = await provider({
      model: tier === "deep" ? models.deep : models.fast,
      system: [{ text: await buildGuideInstructions(exam), cache: true }, { text: await buildStudentContext(input.userId, exam) }],
      messages: [...history, { role: "user", content: text }],
      maxTokens: tier === "deep" ? 1800 : 1200,
      effort: tier === "deep" ? "medium" : "low"
    });
    // Rows are read back in insert order (the seq column), so the question always comes before its answer.
    await db.query("insert into guide_messages (user_id, exam_id, role, content, tier) values ($1,$2,'user',$3,$4)", [input.userId, exam.id, text, tier]);
    await db.query("insert into guide_messages (user_id, exam_id, role, content, tier) values ($1,$2,'assistant',$3,$4)", [input.userId, exam.id, result.text, tier]);
    await recordUsage(db, { userId: input.userId, examId: exam.id, tier, inputTokens: result.inputTokens, outputTokens: result.outputTokens });
    return { ok: true, reply: result.text, left: await guideLimits(input.userId, exam.id) };
  } catch {
    return { ok: false, reason: "error", left };
  }
}
