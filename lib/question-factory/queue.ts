import type { Db } from "@/lib/db";

// The work queue for runs that use an AI chat instead of an API. Pending tasks are handed out as one block of text that
// can be pasted into any chat (Claude, ChatGPT), and the reply is pasted back and applied.

export type QueueTask = { id: string; batch_id: string; stage: string; request: { system: string; prompt: string } };

export async function pendingTasks(db: Db, options: { batchId?: string; stage?: string; limit?: number } = {}) {
  const result = await db.query<QueueTask>(
    `select id, batch_id, stage, request from factory_tasks
     where status = 'pending' and ($1::uuid is null or batch_id = $1) and ($2::text is null or stage = $2)
     order by created_at limit $3`,
    [options.batchId ?? null, options.stage ?? null, options.limit ?? 20]
  );
  return result.rows;
}

export async function pendingByStage(db: Db, batchId: string) {
  const result = await db.query<{ stage: string; n: number }>("select stage, count(*)::int as n from factory_tasks where batch_id = $1 and status = 'pending' group by stage", [batchId]);
  return Object.fromEntries(result.rows.map((row) => [row.stage, row.n])) as Record<string, number>;
}

// One message to paste into a chat. The reply format is strict so it can be applied without anyone retyping.
export function tasksToChatMessage(tasks: QueueTask[]) {
  const blocks = tasks.map((task, index) => `### Task ${index + 1} (id: ${task.id})\nRole: ${task.request.system}\n\n${task.request.prompt}`);
  return [
    `You will do ${tasks.length} independent tasks for an exam question bank. Each task has its own role and asks for a JSON object.`,
    "Do each task on its own, and do not let one task's answer influence another.",
    'Reply with ONLY a JSON array, no commentary, in this exact shape: [{"id":"<task id>","response":{...the JSON object that task asked for...}}]',
    "",
    ...blocks
  ].join("\n");
}

export type ParsedAnswer = { id: string; response: string };

// Accepts a chat reply as pasted: it may be wrapped in a code fence or sentences, and each response may be an object or a string.
export function parseChatAnswers(text: string): ParsedAnswer[] {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end <= start) throw new Error("No JSON list found. Paste the whole reply, starting with [ and ending with ].");
  let list: unknown;
  try {
    list = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new Error("That reply is not valid JSON. Ask the chat to send only the JSON list again.");
  }
  if (!Array.isArray(list)) throw new Error("Expected a list of answers.");
  const answers: ParsedAnswer[] = [];
  for (const item of list) {
    const record = item as { id?: unknown; response?: unknown };
    if (typeof record?.id !== "string" || record.response === undefined) continue;
    answers.push({ id: record.id, response: typeof record.response === "string" ? record.response : JSON.stringify(record.response) });
  }
  if (!answers.length) throw new Error("No answers with an id and a response were found.");
  return answers;
}

// Stores the answers, wakes the questions that were waiting on them, and puts waiting runs back to work.
export async function answerTasks(db: Db, answers: ParsedAnswer[], answeredBy: string) {
  let applied = 0;
  let unknown = 0;
  for (const answer of answers) {
    const updated = await db.query<{ batch_id: string; question_id: string | null }>(
      `update factory_tasks set status = 'answered', response = $2, answered_by = $3, answered_at = now()
       where id::text = $1 and status = 'pending' returning batch_id, question_id`,
      [answer.id, answer.response, answeredBy]
    );
    const row = updated.rows[0];
    if (!row) {
      unknown++;
      continue;
    }
    applied++;
    if (row.question_id) await db.query("update questions set waiting_ai = false where id = $1", [row.question_id]);
    await db.query("update question_batches set status = 'running' where id = $1 and status = 'waiting_ai'", [row.batch_id]);
  }
  return { applied, unknown };
}
