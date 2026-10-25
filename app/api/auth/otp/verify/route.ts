import { z } from "zod";
import { clientIp, jsonError, readJson, sessionResponse } from "@/lib/auth/http";
import { verifyOtp } from "@/lib/auth/otp";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createUser, findUserWithPasswordByEmail, normalizeEmail } from "@/lib/auth/users";
import { getDb } from "@/lib/db";

const schema = z.object({ email: z.string().trim().email().max(254), code: z.string().trim().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  if (!(await getDb())) return jsonError("OTP sign-in is not configured yet.", 503);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Enter the 6-digit code.", 400);
  const email = normalizeEmail(parsed.data.email);
  if (!(await checkRateLimit(`otp-verify:${clientIp(request)}:${email}`, 15, 900))) return jsonError("Too many attempts. Please try again later.", 429);

  const result = await verifyOtp(email, parsed.data.code);
  if (result === "expired") return jsonError("That code has expired. Request a new one.", 400);
  if (result === "too_many_attempts") return jsonError("Too many wrong attempts. Request a new code.", 429);
  if (result !== "ok") return jsonError("That code is not correct.", 400);

  const existing = await findUserWithPasswordByEmail(email);
  const user = existing?.user ?? (await createUser({ email, passwordHash: null, emailVerified: true }));
  if (!user) return jsonError("Could not sign you in.", 500);
  return sessionResponse(user);
}
