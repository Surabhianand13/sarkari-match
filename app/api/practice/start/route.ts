import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/auth/guards";
import { jsonError, readJson } from "@/lib/auth/http";
import { startSession } from "@/lib/practice";

export const dynamic = "force-dynamic";

const schema = z.object({ subject: z.string().trim().min(1).max(120), topic: z.string().trim().max(120).nullish() });

export async function POST(request: Request) {
  const user = await getOptionalUser();
  if (!user) return NextResponse.json({ error: "Sign in to practise.", reason: "login" }, { status: 401 });
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Choose a subject.", 400);
  const result = await startSession(user.id, parsed.data.subject, parsed.data.topic || null);
  if (!result.ok) return jsonError("No questions are available for that choice yet.", 409);
  return NextResponse.json({ sessionId: result.sessionId });
}
