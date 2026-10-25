import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { normalizeEmail } from "@/lib/auth/users";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(email: string, code: string) {
  const secret = process.env.AUTH_SECRET ?? "dev";
  return createHash("sha256").update(`${secret}:${normalizeEmail(email)}:${code}`).digest("hex");
}

export function otpMatches(email: string, code: string, storedHash: string) {
  const a = Buffer.from(hashOtp(email, code));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function storeOtp(email: string, code: string) {
  const db = await getDb();
  if (!db) return;
  await db.query("update auth_otps set consumed_at = now() where lower(email) = $1 and consumed_at is null", [normalizeEmail(email)]);
  await db.query("insert into auth_otps (email, code_hash, expires_at) values ($1, $2, now() + ($3 || ' minutes')::interval)", [normalizeEmail(email), hashOtp(email, code), String(OTP_TTL_MINUTES)]);
}

export type OtpVerification = "ok" | "invalid" | "expired" | "too_many_attempts";

export async function verifyOtp(email: string, code: string): Promise<OtpVerification> {
  const db = await getDb();
  if (!db) return "invalid";
  const { rows } = await db.query<{ id: string; code_hash: string; expires_at: string; attempts: number }>(
    "select id, code_hash, expires_at, attempts from auth_otps where lower(email) = $1 and consumed_at is null order by created_at desc limit 1",
    [normalizeEmail(email)]
  );
  const row = rows[0];
  if (!row) return "invalid";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  if (row.attempts >= OTP_MAX_ATTEMPTS) return "too_many_attempts";
  if (!otpMatches(email, code, row.code_hash)) {
    await db.query("update auth_otps set attempts = attempts + 1 where id = $1", [row.id]);
    return "invalid";
  }
  await db.query("update auth_otps set consumed_at = now() where id = $1", [row.id]);
  return "ok";
}
