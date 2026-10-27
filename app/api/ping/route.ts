import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Answers without touching the database. Used by Render's health check and the Cloudflare keep-alive worker,
// so keeping the free web service awake does not also keep the free database awake.
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
