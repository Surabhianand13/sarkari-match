import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/admin/audit";
import { jsonError, readJson } from "@/lib/auth/http";
import { normalizeEmail } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { grantGuide, grantPass } from "@/lib/offers";
import { verifyCheckoutRef } from "@/lib/tests/checkout-ref";

export const dynamic = "force-dynamic";

// Called by the payment page or webhook after a successful payment. Authenticated with ACCESS_GRANT_SECRET.
// Body, either:
//   { paymentRef, ref, amountPaise? }  where ref is the signed value passed to the payment page (it says which product, which target and the quoted amount)
//   { paymentRef, email, product: "pass", seriesSlug } or { paymentRef, email, product: "guide", examSlug } for server-to-server use.
// paymentRef makes the call idempotent. If amountPaise is sent with a ref, it must not be lower than the quoted amount.
const schema = z.object({
  paymentRef: z.string().min(4).max(200),
  ref: z.string().optional(),
  product: z.enum(["pass", "guide"]).optional(),
  email: z.string().email().optional(),
  seriesSlug: z.string().optional(),
  examSlug: z.string().optional(),
  amountPaise: z.number().int().nonnegative().optional(),
  expiresAt: z.string().datetime().optional()
});

function authorised(request: Request) {
  const secret = process.env.ACCESS_GRANT_SECRET;
  if (!secret || secret.length < 24) return false;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const SYSTEM_ACTOR = "00000000-0000-4000-8000-000000000000";

export async function POST(request: Request) {
  if (!authorised(request)) return jsonError("Unauthorized.", 401);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid request.", 400);
  const db = await getDb();
  if (!db) return jsonError("Database unavailable.", 503);
  const body = parsed.data;

  let userId: string | null = null;
  let product: "pass" | "guide" = body.product ?? "pass";
  let targetId: string | null = null;
  if (body.ref) {
    const ref = await verifyCheckoutRef(body.ref);
    if (!ref) return jsonError("The payment reference has expired or is invalid.", 400);
    if (body.amountPaise !== undefined && ref.amountPaise > 0 && body.amountPaise < ref.amountPaise) return jsonError("The amount paid is lower than the quoted amount.", 400);
    userId = ref.userId;
    product = ref.product;
    targetId = ref.targetId;
  } else if (body.email) {
    userId = (await db.query<{ id: string }>("select id from users where lower(email) = $1", [normalizeEmail(body.email)])).rows[0]?.id ?? null;
    if (product === "pass" && body.seriesSlug) targetId = (await db.query<{ id: string }>("select id from test_series where slug = $1", [body.seriesSlug])).rows[0]?.id ?? null;
    if (product === "guide" && body.examSlug) targetId = (await db.query<{ id: string }>("select id from exams where slug = $1", [body.examSlug])).rows[0]?.id ?? null;
  }
  if (!userId || !targetId) return jsonError("User or product not found.", 404);

  if (product === "pass") {
    const result = await grantPass(db, { userId, seriesId: targetId, source: "purchase", paymentRef: body.paymentRef, expiresAt: body.expiresAt ?? null });
    if (result.granted) await writeAudit(db, { actorId: SYSTEM_ACTOR, action: "access.purchase", entityType: "test_series", entityId: targetId, after: { userId, paymentRef: body.paymentRef } });
    return NextResponse.json({ ok: true, product, granted: result.granted, expiresAt: result.expiresAt });
  }
  const result = await grantGuide(db, { userId, examId: targetId, source: "purchase", paymentRef: body.paymentRef, expiresAt: body.expiresAt ?? null });
  if (result.granted) await writeAudit(db, { actorId: SYSTEM_ACTOR, action: "guide.purchase", entityType: "exam", entityId: targetId, after: { userId, paymentRef: body.paymentRef } });
  return NextResponse.json({ ok: true, product, granted: result.granted, expiresAt: result.expiresAt });
}
