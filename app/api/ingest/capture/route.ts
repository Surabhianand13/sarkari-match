import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { jsonError, readJson } from "@/lib/auth/http";
import { getDb } from "@/lib/db";
import { LeadError, ingestListing, ingestPage } from "@/lib/ingest/leads";
import { capturePayloadSchema } from "@/lib/ingest/parse";
import { authenticateIngestToken } from "@/lib/ingest/tokens";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_500_000;

// The collector extension signs in with a token made on /admin/leads/extension. A token can only add pending leads.
async function authorise(request: Request) {
  const db = await getDb();
  if (!db) return { error: jsonError("The database is not configured.", 503) };
  const token = await authenticateIngestToken(db, request.headers.get("authorization"));
  if (!token) return { error: jsonError("This token is not valid. Make a new one in the admin dashboard.", 401) };
  if (!(await checkRateLimit(`ingest:${token.id}`, 3000, 3600))) return { error: jsonError("Too many captures this hour. Try again later.", 429) };
  return { db, token };
}

// Lets the extension check its settings.
export async function GET(request: Request) {
  const auth = await authorise(request);
  if ("error" in auth) return auth.error;
  return NextResponse.json({ ok: true, label: auth.token.label });
}

export async function POST(request: Request) {
  const auth = await authorise(request);
  if ("error" in auth) return auth.error;
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return jsonError("That page is too large to capture.", 413);

  const body = await readJson(request);
  const parsed = capturePayloadSchema.safeParse(body);
  if (!parsed.success) return jsonError("The captured page was not in the expected format. Update the extension and try again.", 400);

  try {
    const result = parsed.data.mode === "list" ? await ingestListing(auth.db, parsed.data, auth.token.id) : await ingestPage(auth.db, parsed.data, auth.token.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LeadError) return jsonError(error.message, 422);
    throw error;
  }
}
