import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ok" | "not_configured" | "error" = "not_configured";
  const db = await getDb().catch(() => null);
  if (db) {
    database = await db.query("select 1").then(() => "ok" as const).catch(() => "error" as const);
  }
  return NextResponse.json({ ok: database !== "error", service: "sarkarimatch", database, time: new Date().toISOString() }, { status: database === "error" ? 503 : 200 });
}
