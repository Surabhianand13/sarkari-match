import { getDb } from "@/lib/db";

// Fixed-window limiter backed by the database so it works across instances.
// Returns true when the request is allowed.
export async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const db = await getDb();
  if (!db) return true;
  const { rows } = await db.query<{ hits: number }>(
    `insert into rate_limits (key, window_start, hits) values ($1, now(), 1)
     on conflict (key) do update set
       hits = case when rate_limits.window_start < now() - ($2 || ' seconds')::interval then 1 else rate_limits.hits + 1 end,
       window_start = case when rate_limits.window_start < now() - ($2 || ' seconds')::interval then now() else rate_limits.window_start end
     returning hits`,
    [key, String(windowSeconds)]
  );
  return (rows[0]?.hits ?? 1) <= limit;
}
