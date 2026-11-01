import { indexNowKey } from "@/lib/indexnow";

// IndexNow checks that the site owns the key by fetching it from here.
export const dynamic = "force-dynamic";

export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
