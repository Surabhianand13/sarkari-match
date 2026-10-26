import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/auth/guards";
import { jsonError, readJson } from "@/lib/auth/http";
import { saveAnswer } from "@/lib/tests/attempts";

export const dynamic = "force-dynamic";

const schema = z.object({
  questionId: z.string().uuid(),
  selected: z.enum(["A", "B", "C", "D"]).nullable(),
  marked: z.boolean().default(false),
  timeSpentSeconds: z.number().min(0).max(3600).default(0)
});

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await getOptionalUser();
  if (!user) return jsonError("Sign in again to continue.", 401);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || !/^[0-9a-f-]{36}$/i.test(attemptId)) return jsonError("Invalid answer.", 400);
  const result = await saveAnswer(user.id, attemptId, parsed.data);
  if (result === "saved") return NextResponse.json({ ok: true });
  if (result === "expired") return NextResponse.json({ error: "Time is up. Your test has been submitted.", reason: "expired" }, { status: 409 });
  return jsonError("Attempt not found.", 404);
}
