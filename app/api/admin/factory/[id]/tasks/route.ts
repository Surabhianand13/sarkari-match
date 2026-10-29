import { NextResponse } from "next/server";
import { adminApiUser, uuidPattern } from "@/lib/admin/api";
import { adminDb, messageFrom } from "@/lib/admin/db";
import { answerTasks, parseChatAnswers, pendingTasks, tasksToChatMessage } from "@/lib/question-factory/queue";

export const dynamic = "force-dynamic";

const TASKS_PER_MESSAGE = 15;

// GET: the next tasks for a stage as one message to paste into a chat.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminApiUser())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const stage = new URL(request.url).searchParams.get("stage") ?? undefined;
  const tasks = await pendingTasks(await adminDb(), { batchId: id, stage, limit: TASKS_PER_MESSAGE });
  return NextResponse.json({ count: tasks.length, message: tasks.length ? tasksToChatMessage(tasks) : "" });
}

// POST: the chat's reply, pasted back.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminApiUser())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { text?: string; by?: string } | null;
  if (!body?.text) return NextResponse.json({ error: "Paste the reply first." }, { status: 400 });
  try {
    const answers = parseChatAnswers(body.text);
    const db = await adminDb();
    // Only tasks that belong to this run can be answered from its page.
    const mine = await db.query<{ id: string }>("select id::text from factory_tasks where batch_id = $1 and status = 'pending'", [id]);
    const allowed = new Set(mine.rows.map((row) => row.id));
    const result = await answerTasks(db, answers.filter((answer) => allowed.has(answer.id)), (body.by ?? "chat").slice(0, 40));
    return NextResponse.json({ ...result, ignored: answers.length - result.applied });
  } catch (error) {
    return NextResponse.json({ error: messageFrom(error) }, { status: 400 });
  }
}
