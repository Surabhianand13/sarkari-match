import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, readJson } from "@/lib/auth/http";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { askAssistant, assistantEnabled } from "@/lib/assistant";

export const dynamic = "force-dynamic";

const schema = z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(800) })).min(1).max(12) });

export async function POST(request: Request) {
  if (!assistantEnabled()) return jsonError("The assistant is not available right now.", 503);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") return jsonError("Ask a short question.", 400);
  if (!(await checkRateLimit(`assistant:${clientIp(request)}`, 20, 600))) return jsonError("You are asking too fast. Please wait a few minutes.", 429);
  if (!(await checkRateLimit("assistant:global-day", Number(process.env.ASSISTANT_DAILY_LIMIT ?? 3000), 86400))) return jsonError("The assistant is busy. Please try again later or message us on WhatsApp.", 429);
  try {
    return NextResponse.json({ reply: await askAssistant(parsed.data.messages) });
  } catch {
    return jsonError("The assistant could not answer. Please try again or message us on WhatsApp.", 502);
  }
}
