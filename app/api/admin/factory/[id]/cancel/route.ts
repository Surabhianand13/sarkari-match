import { NextResponse } from "next/server";
import { adminApiUser, uuidPattern } from "@/lib/admin/api";
import { adminDb } from "@/lib/admin/db";
import { cancelBatch } from "@/lib/question-factory/engine";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await adminApiUser())) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await cancelBatch(await adminDb(), id);
  return NextResponse.json({ ok: true });
}
