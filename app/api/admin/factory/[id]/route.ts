import { NextResponse } from "next/server";
import { adminApiUser, uuidPattern } from "@/lib/admin/api";
import { adminDb } from "@/lib/admin/db";
import { batchSnapshot } from "@/lib/question-factory/monitor";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminApiUser())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const snapshot = await batchSnapshot(await adminDb(), id);
  return snapshot ? NextResponse.json(snapshot) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
