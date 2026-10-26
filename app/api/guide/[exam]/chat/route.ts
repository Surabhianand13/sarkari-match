import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/auth/guards";
import { jsonError, readJson } from "@/lib/auth/http";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { MAX_MESSAGE_CHARS, sendGuideMessage } from "@/lib/guide/service";

export const dynamic = "force-dynamic";

const schema = z.object({ message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS), deep: z.boolean().default(false) });

const reasons = {
  not_found: ["Exam not found.", 404],
  no_access: ["The AI Study Guide for this exam is not active on your account.", 403],
  cap_fast: ["You have used today's AI messages. They reset tomorrow.", 429],
  cap_deep: ["You have used today's deeper explanations. Ask a regular question, or try again tomorrow.", 429],
  unavailable: ["The AI Study Guide is not available right now. Please try again later.", 503],
  error: ["The AI Study Guide could not answer. Please try again.", 502]
} as const;

export async function POST(request: Request, { params }: { params: Promise<{ exam: string }> }) {
  const { exam } = await params;
  const user = await getOptionalUser();
  if (!user) return jsonError("Sign in again to continue.", 401);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Ask a short question.", 400);
  if (!(await checkRateLimit(`guide:${user.id}`, 12, 60))) return jsonError("You are sending messages too fast. Wait a minute.", 429);
  const result = await sendGuideMessage({ userId: user.id, examSlug: exam, text: parsed.data.message, deep: parsed.data.deep });
  if (result.ok) return NextResponse.json({ reply: result.reply, left: result.left });
  const [message, status] = reasons[result.reason];
  return NextResponse.json({ error: message, left: result.left }, { status });
}
