import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, readJson } from "@/lib/auth/http";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254), exam: z.string().trim().max(80).default("ssc-cgl"), source: z.string().trim().max(40).optional() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Enter a valid email address.", 400);
  if (!(await checkRateLimit(`waitlist:${clientIp(request)}`, 6, 600))) return jsonError("Too many requests. Please try again later.", 429);
  const db = await getDb();
  if (!db) return jsonError("The list is not available right now.", 503);
  // Same answer whether or not the address was already on the list.
  await db.query("insert into waitlist (email, exam, source) values ($1,$2,$3) on conflict (email, exam) do nothing", [parsed.data.email, parsed.data.exam, parsed.data.source ?? null]);
  return NextResponse.json({ ok: true });
}
