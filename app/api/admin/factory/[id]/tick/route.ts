import { NextResponse } from "next/server";
import { adminApiUser, uuidPattern } from "@/lib/admin/api";
import { adminDb, messageFrom } from "@/lib/admin/db";
import { advanceBatch } from "@/lib/question-factory/engine";
import { batchSnapshot } from "@/lib/question-factory/monitor";
import { aiForConfig } from "@/lib/question-factory/runtime";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Does a short burst of work for a run and returns where it stands. The monitor page calls this in a loop.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminApiUser())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = await adminDb();
  const found = await db.query<{ config: { mode?: string; provider?: string } }>("select config from question_batches where id = $1", [id]);
  if (!found.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    await advanceBatch(db, aiForConfig(db, found.rows[0].config), id, { budgetMs: 8000 });
  } catch (error) {
    return NextResponse.json({ error: messageFrom(error) }, { status: 400 });
  }
  return NextResponse.json(await batchSnapshot(db, id));
}
