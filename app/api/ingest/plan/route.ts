import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { jsonError, readJson } from "@/lib/auth/http";
import { getDb } from "@/lib/db";
import { LeadError } from "@/lib/ingest/leads";
import { capturePayloadSchema } from "@/lib/ingest/parse";
import { planListing } from "@/lib/ingest/sync";
import { authenticateIngestToken } from "@/lib/ingest/tokens";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_500_000;

// One-click sync. The extension sends a listing page (in chunks of up to 600 links) and gets back the notifications whose own
// page it should now read: new ones, headline-only ones, and ones the site has updated since. Like capture, it can only add pending leads.
export async function POST(request: Request) {
  const db = await getDb();
  if (!db) return jsonError("The database is not configured.", 503);
  const token = await authenticateIngestToken(db, request.headers.get("authorization"));
  if (!token) return jsonError("This token is not valid. Make a new one in the admin dashboard.", 401);
  if (!(await checkRateLimit(`ingest-plan:${token.id}`, 600, 3600))) return jsonError("Too many checks this hour. Try again later.", 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return jsonError("That listing is too large.", 413);

  const body = await readJson(request);
  const payload = capturePayloadSchema.safeParse(body);
  if (!payload.success) return jsonError("The listing was not in the expected format. Update the extension and try again.", 400);
  const since = z.string().date().optional().safeParse((body as { since?: unknown } | null)?.since);
  if (!since.success) return jsonError("The 'since' date is not valid.", 400);

  try {
    return NextResponse.json(await planListing(db, payload.data, token.id, since.data));
  } catch (error) {
    if (error instanceof LeadError) return jsonError(error.message, 422);
    throw error;
  }
}
