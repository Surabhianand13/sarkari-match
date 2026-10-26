import { getDb, type Db } from "@/lib/db";
import { grantSeriesAccess } from "@/lib/tests/access";

// The per-exam offer: an Exam Pass (the test series price, with a validity), an optional AI Study Guide, and a second-exam discount.
export type ExamOffer = {
  examId: string;
  passValidityDays: number;
  secondExamDiscountPercent: number;
  guideEnabled: boolean;
  guidePricePaise: number | null;
  guideMrpPaise: number | null;
  guideValidityDays: number;
  aiDailyFastCap: number;
  aiDailyDeepCap: number;
};

export const IST_DAY = "(now() at time zone 'Asia/Kolkata')::date";

export function defaultOffer(examId: string): ExamOffer {
  return { examId, passValidityDays: 365, secondExamDiscountPercent: 20, guideEnabled: false, guidePricePaise: null, guideMrpPaise: null, guideValidityDays: 365, aiDailyFastCap: 30, aiDailyDeepCap: 2 };
}

type OfferRow = {
  exam_id: string; pass_validity_days: number; second_exam_discount_percent: number; guide_enabled: boolean; guide_price_paise: number | null;
  guide_mrp_paise: number | null; guide_validity_days: number; ai_daily_fast_cap: number; ai_daily_deep_cap: number;
};

export async function getExamOffer(examId: string, db?: Db | null): Promise<ExamOffer> {
  const conn = db ?? (await getDb());
  if (!conn) return defaultOffer(examId);
  const row = (await conn.query<OfferRow>("select * from exam_offers where exam_id = $1", [examId])).rows[0];
  if (!row) return defaultOffer(examId);
  return {
    examId, passValidityDays: Number(row.pass_validity_days), secondExamDiscountPercent: Number(row.second_exam_discount_percent), guideEnabled: row.guide_enabled,
    guidePricePaise: row.guide_price_paise === null ? null : Number(row.guide_price_paise), guideMrpPaise: row.guide_mrp_paise === null ? null : Number(row.guide_mrp_paise),
    guideValidityDays: Number(row.guide_validity_days), aiDailyFastCap: Number(row.ai_daily_fast_cap), aiDailyDeepCap: Number(row.ai_daily_deep_cap)
  };
}

// Whole rupees, rounded to the nearest rupee, so the amount sent to the payment page is a clean figure.
export function discountedPrice(listPaise: number, percent: number) {
  return Math.round((listPaise * (100 - percent)) / 100 / 100) * 100;
}

export type PassQuote = { examId: string; examSlug: string; listPaise: number; payablePaise: number; discountPercent: number; validityDays: number; reason: "second_exam" | null };

// What this learner pays for a Pass. A learner who already bought a Pass for a different exam gets the second-exam discount.
export async function passQuote(userId: string | null, seriesId: string, db?: Db | null): Promise<PassQuote | null> {
  const conn = db ?? (await getDb());
  if (!conn) return null;
  const series = (await conn.query<{ price_paise: number; exam_id: string; exam_slug: string }>(
    "select s.price_paise, s.exam_id, e.slug as exam_slug from test_series s join exams e on e.id = s.exam_id where s.id = $1", [seriesId])).rows[0];
  if (!series) return null;
  const offer = await getExamOffer(series.exam_id, conn);
  const list = Number(series.price_paise);
  let percent = 0;
  if (userId && list > 0 && offer.secondExamDiscountPercent > 0) {
    const other = await conn.query(
      `select 1 from test_access a join test_series s on s.id = a.series_id
        where a.user_id = $1 and a.source = 'purchase' and s.exam_id <> $2 and s.price_paise > 0
          and a.starts_at <= now() and (a.expires_at is null or a.expires_at > now()) limit 1`, [userId, series.exam_id]);
    if (other.rows.length > 0) percent = offer.secondExamDiscountPercent;
  }
  return { examId: series.exam_id, examSlug: series.exam_slug, listPaise: list, payablePaise: percent ? discountedPrice(list, percent) : list, discountPercent: percent, validityDays: offer.passValidityDays, reason: percent ? "second_exam" : null };
}

export async function hasPassForExam(userId: string, examId: string, db?: Db | null): Promise<boolean> {
  const conn = db ?? (await getDb());
  if (!conn) return false;
  const { rows } = await conn.query(
    `select 1 from test_access a join test_series s on s.id = a.series_id
      where a.user_id = $1 and s.exam_id = $2 and s.price_paise > 0 and a.starts_at <= now() and (a.expires_at is null or a.expires_at > now()) limit 1`, [userId, examId]);
  return rows.length > 0;
}

export async function hasAnyPaidAccess(userId: string, db?: Db | null): Promise<boolean> {
  const conn = db ?? (await getDb());
  if (!conn) return false;
  const { rows } = await conn.query(
    `select 1 from test_access a join test_series s on s.id = a.series_id
      where a.user_id = $1 and s.price_paise > 0 and a.starts_at <= now() and (a.expires_at is null or a.expires_at > now()) limit 1`, [userId]);
  return rows.length > 0;
}

export async function hasGuideAccess(userId: string | null, examId: string, db?: Db | null): Promise<boolean> {
  if (!userId) return false;
  const conn = db ?? (await getDb());
  if (!conn) return false;
  const { rows } = await conn.query("select 1 from guide_access where user_id = $1 and exam_id = $2 and starts_at <= now() and (expires_at is null or expires_at > now()) limit 1", [userId, examId]);
  return rows.length > 0;
}

export type GuideStatus = { enabled: boolean; pricePaise: number | null; mrpPaise: number | null; validityDays: number; hasPass: boolean; owned: boolean; canBuy: boolean };

// The Guide is sold only to learners who hold a Pass for the same exam.
export async function getGuideStatus(userId: string | null, examId: string, db?: Db | null): Promise<GuideStatus> {
  const offer = await getExamOffer(examId, db);
  const enabled = offer.guideEnabled && offer.guidePricePaise !== null;
  const [hasPass, owned] = userId ? await Promise.all([hasPassForExam(userId, examId, db), hasGuideAccess(userId, examId, db)]) : [false, false];
  return { enabled, pricePaise: offer.guidePricePaise, mrpPaise: offer.guideMrpPaise, validityDays: offer.guideValidityDays, hasPass, owned, canBuy: enabled && hasPass && !owned };
}

const DAY = 86400000;
const expiryFromDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

export type PassGrant = { userId: string; seriesId: string; source: "purchase" | "grant" | "promo"; paymentRef?: string | null; expiresAt?: string | null };

// Grants a Pass; the end date defaults to the exam's Pass validity (12 months unless the exam says otherwise).
export async function grantPass(db: Db, input: PassGrant): Promise<{ granted: boolean; expiresAt: string }> {
  let expiresAt = input.expiresAt ?? null;
  if (!expiresAt) {
    const quote = await passQuote(null, input.seriesId, db);
    expiresAt = expiryFromDays(quote?.validityDays ?? 365);
  }
  const result = await grantSeriesAccess(db, { ...input, expiresAt });
  return { granted: result.granted, expiresAt };
}

export type GuideGrant = { userId: string; examId: string; source: "purchase" | "grant" | "promo"; paymentRef?: string | null; expiresAt?: string | null };

// Idempotent on the payment reference, and a manual grant is not duplicated while an active Guide exists.
export async function grantGuide(db: Db, input: GuideGrant): Promise<{ granted: boolean; expiresAt: string }> {
  const offer = await getExamOffer(input.examId, db);
  const expiresAt = input.expiresAt ?? expiryFromDays(offer.guideValidityDays);
  if (input.paymentRef) {
    const inserted = await db.query(
      "insert into guide_access (user_id, exam_id, source, payment_ref, expires_at) values ($1,$2,$3,$4,$5) on conflict (payment_ref) where payment_ref is not null do nothing returning id",
      [input.userId, input.examId, input.source, input.paymentRef, expiresAt]);
    return { granted: inserted.rowCount > 0, expiresAt };
  }
  if (await hasGuideAccess(input.userId, input.examId, db)) return { granted: false, expiresAt };
  await db.query("insert into guide_access (user_id, exam_id, source, expires_at) values ($1,$2,$3,$4)", [input.userId, input.examId, input.source, expiresAt]);
  return { granted: true, expiresAt };
}

export type Tier = "fast" | "deep";

export async function usageToday(userId: string, examId: string, db?: Db | null): Promise<Record<Tier, number>> {
  const conn = db ?? (await getDb());
  const out: Record<Tier, number> = { fast: 0, deep: 0 };
  if (!conn) return out;
  const { rows } = await conn.query<{ tier: Tier; turns: number }>(`select tier, turns from ai_usage where user_id = $1 and exam_id = $2 and day = ${IST_DAY}`, [userId, examId]);
  for (const row of rows) out[row.tier] = Number(row.turns);
  return out;
}

export async function recordUsage(db: Db, input: { userId: string; examId: string; tier: Tier; inputTokens: number; outputTokens: number }) {
  await db.query(
    `insert into ai_usage (user_id, exam_id, day, tier, turns, input_tokens, output_tokens) values ($1,$2,${IST_DAY},$3,1,$4,$5)
     on conflict (user_id, exam_id, day, tier) do update set turns = ai_usage.turns + 1, input_tokens = ai_usage.input_tokens + excluded.input_tokens, output_tokens = ai_usage.output_tokens + excluded.output_tokens`,
    [input.userId, input.examId, input.tier, Math.max(0, Math.round(input.inputTokens)), Math.max(0, Math.round(input.outputTokens))]
  );
}
