import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Serves a banner image. The page adds ?v=<updated time> to each URL, so the response can be cached for a year.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; variant: string }> }) {
  const { id, variant } = await params;
  const db = await getDb();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id) || !["desktop", "mobile"].includes(variant)) return new Response("Not found", { status: 404 });
  const column = variant === "desktop" ? "desktop" : "mobile";
  const result = await db.query<{ image: Uint8Array; type: string }>(`select ${column}_image as image, ${column}_type as type from banners where id = $1`, [id]);
  const row = result.rows[0];
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.image), { headers: { "Content-Type": row.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
