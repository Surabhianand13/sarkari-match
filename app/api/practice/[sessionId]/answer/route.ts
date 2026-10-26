import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/auth/guards";
import { jsonError, readJson } from "@/lib/auth/http";
import { answerQuestion } from "@/lib/practice";

export const dynamic = "force-dynamic";

const schema = z.object({ questionId: z.string().uuid(), selected: z.enum(["A", "B", "C", "D"]) });

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getOptionalUser();
  if (!user) return jsonError("Sign in again to continue.", 401);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || !/^[0-9a-f-]{36}$/i.test(sessionId)) return jsonError("Invalid answer.", 400);
  const result = await answerQuestion(user.id, sessionId, parsed.data.questionId, parsed.data.selected);
  if (result.ok) return NextResponse.json(result);
  if (result.reason === "already_answered") return jsonError("That question was already answered.", 409);
  if (result.reason === "completed") return jsonError("This session is finished.", 409);
  return jsonError("Session not found.", 404);
}
