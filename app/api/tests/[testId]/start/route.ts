import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/guards";
import { jsonError } from "@/lib/auth/http";
import { startAttempt } from "@/lib/tests/attempts";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(testId)) return jsonError("Test not found.", 404);
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Sign in to start the test.", reason: "login" }, { status: 401 });
  const result = await startAttempt(user.id, testId);
  if (result.ok) return NextResponse.json({ attemptId: result.attemptId });
  if (result.reason === "locked") return NextResponse.json({ error: "This test is part of the paid series.", reason: "locked" }, { status: 403 });
  if (result.reason === "no_questions") return jsonError("This test has no questions yet.", 409);
  return jsonError("Test not found.", 404);
}
