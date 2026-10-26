import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, jsonError, readJson } from "@/lib/auth/http";
import { generateOtpCode, OTP_TTL_MINUTES, storeOtp } from "@/lib/auth/otp";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { normalizeEmail } from "@/lib/auth/users";
import { getDb } from "@/lib/db";
import { createEmailProvider } from "@/lib/email/provider";

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: Request) {
  if (!(await getDb())) return jsonError("OTP sign-in is not configured yet.", 503);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Enter a valid email address.", 400);
  const email = normalizeEmail(parsed.data.email);
  const allowed = (await checkRateLimit(`otp:${email}`, 5, 3600)) && (await checkRateLimit(`otp-ip:${clientIp(request)}`, 20, 3600));
  if (!allowed) return jsonError("Too many codes requested. Please try again later.", 429);

  const code = generateOtpCode();
  await storeOtp(email, code);
  const sent = await createEmailProvider().send({
    to: email,
    template: "login_otp",
    subject: "Your Sarkari Match sign-in code",
    data: { code, validForMinutes: OTP_TTL_MINUTES }
  });
  if (sent.skipped && process.env.NODE_ENV !== "production") console.info(`[dev] sign-in code for ${email}: ${code}`);
  // Same response whether or not the account exists.
  return NextResponse.json({ ok: true });
}
