import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/guards";
import { jsonError } from "@/lib/auth/http";
import { submitAttempt } from "@/lib/tests/attempts";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await getOptionalUser();
  if (!user) return jsonError("Sign in again to submit.", 401);
  if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !(await submitAttempt(user.id, attemptId))) return jsonError("Attempt not found.", 404);
  return NextResponse.json({ ok: true, resultUrl: `/tests/attempt/${attemptId}/result` });
}
