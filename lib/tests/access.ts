import { getDb, type Db } from "@/lib/db";

export async function hasSeriesAccess(userId: string | null, seriesId: string, priceOverride?: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  if (priceOverride === undefined) {
    const price = await db.query<{ price_paise: number }>("select price_paise from test_series where id = $1", [seriesId]);
    if (!price.rows[0]) return false;
    priceOverride = price.rows[0].price_paise;
  }
  if (priceOverride === 0) return true;
  if (!userId) return false;
  const { rows } = await db.query("select 1 from test_access where user_id = $1 and series_id = $2 and starts_at <= now() and (expires_at is null or expires_at > now()) limit 1", [userId, seriesId]);
  return rows.length > 0;
}

export async function canOpenTest(userId: string | null, test: { seriesId: string; isFreeSample: boolean }): Promise<boolean> {
  if (test.isFreeSample) return true;
  return hasSeriesAccess(userId, test.seriesId);
}

export type GrantInput = { userId: string; seriesId: string; source: "purchase" | "grant" | "promo"; paymentRef?: string | null; expiresAt?: string | null };

// Idempotent: the same payment reference never creates a second row, and a manual grant is not duplicated.
export async function grantSeriesAccess(db: Db, input: GrantInput): Promise<{ granted: boolean }> {
  if (input.paymentRef) {
    const inserted = await db.query(
      "insert into test_access (user_id, series_id, source, payment_ref, expires_at) values ($1,$2,$3,$4,$5) on conflict (payment_ref) where payment_ref is not null do nothing returning id",
      [input.userId, input.seriesId, input.source, input.paymentRef, input.expiresAt ?? null]
    );
    return { granted: inserted.rowCount > 0 };
  }
  const existing = await db.query("select 1 from test_access where user_id = $1 and series_id = $2 and (expires_at is null or expires_at > now()) limit 1", [input.userId, input.seriesId]);
  if (existing.rowCount > 0) return { granted: false };
  await db.query("insert into test_access (user_id, series_id, source, expires_at) values ($1,$2,$3,$4)", [input.userId, input.seriesId, input.source, input.expiresAt ?? null]);
  return { granted: true };
}
