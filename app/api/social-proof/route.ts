import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const revalidate = 60;

// Real purchases only: a learner's first name, their state when they gave one, the series and when it happened.
// Grants, promos and free access never appear, and nothing is returned when there are no recent purchases.
export async function GET() {
  const db = await getDb();
  if (!db) return NextResponse.json({ items: [] });
  const rows = await db.query<{ first_name: string | null; state: string | null; series: string; created_at: string }>(
    `select split_part(coalesce(u.full_name, ''), ' ', 1) as first_name, st.name as state, s.title as series, a.created_at::text as created_at
       from test_access a
       join users u on u.id = a.user_id
       join test_series s on s.id = a.series_id
       left join candidate_profiles cp on cp.user_id = u.id
       left join states st on st.id = cp.domicile_state_id
      where a.source = 'purchase' and a.created_at > now() - interval '7 days'
      order by a.created_at desc limit 8`
  );
  const items = rows.rows
    .filter((row) => row.first_name && row.first_name.length > 1)
    .map((row) => ({ name: row.first_name, state: row.state, series: row.series, at: new Date(row.created_at).toISOString() }));
  return NextResponse.json({ items });
}
