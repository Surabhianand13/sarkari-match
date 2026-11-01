import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Serves a picture attached to a question. An image never changes once saved (a new upload gets a new id), so it can be cached for a year.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  if (!db || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const result = await db.query<{ data: Uint8Array; content_type: string }>("select data, content_type from question_images where id = $1", [id]);
  const row = result.rows[0];
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), { headers: { "Content-Type": row.content_type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
