import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAudit } from "@/lib/admin/audit";
import { jsonError, readJson } from "@/lib/auth/http";
import { normalizeEmail } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { grantSeriesAccess } from "@/lib/tests/access";
import { verifyCheckoutRef } from "@/lib/tests/checkout-ref";

export const dynamic = "force-dynamic";

// Called by the payment page or webhook after a successful payment. Authenticated with ACCESS_GRANT_SECRET.
// Body: { paymentRef, ref } where ref is the signed value passed to the payment page,
//   or { paymentRef, email, seriesSlug } for server-to-server use. paymentRef makes the call idempotent.
const schema = z.object({
  paymentRef: z.string().min(4).max(200),
  ref: z.string().optional(),
  email: z.string().email().optional(),
  seriesSlug: z.string().optional(),
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

export async function POST(request: Request) {
  if (!authorised(request)) return jsonError("Unauthorized.", 401);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid request.", 400);
  const db = await getDb();
  if (!db) return jsonError("Database unavailable.", 503);

  let userId: string | null = null;
  let seriesId: string | null = null;
  if (parsed.data.ref) {
    const ref = await verifyCheckoutRef(parsed.data.ref);
    if (!ref) return jsonError("The payment reference has expired or is invalid.", 400);
    userId = ref.userId;
    seriesId = ref.seriesId;
  } else if (parsed.data.email && parsed.data.seriesSlug) {
    userId = (await db.query<{ id: string }>("select id from users where lower(email) = $1", [normalizeEmail(parsed.data.email)])).rows[0]?.id ?? null;
    seriesId = (await db.query<{ id: string }>("select id from test_series where slug = $1", [parsed.data.seriesSlug])).rows[0]?.id ?? null;
  }
  if (!userId || !seriesId) return jsonError("User or series not found.", 404);

  const result = await grantSeriesAccess(db, { userId, seriesId, source: "purchase", paymentRef: parsed.data.paymentRef, expiresAt: parsed.data.expiresAt ?? null });
  if (result.granted) await writeAudit(db, { actorId: "00000000-0000-4000-8000-000000000000", action: "access.purchase", entityType: "test_series", entityId: seriesId, after: { userId, paymentRef: parsed.data.paymentRef } });
  return NextResponse.json({ ok: true, granted: result.granted });
}
