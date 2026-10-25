import { z } from "zod";
import { clientIp, jsonError, readJson, sessionResponse } from "@/lib/auth/http";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { findUserWithPasswordByEmail, normalizeEmail } from "@/lib/auth/users";
import { getDb } from "@/lib/db";

const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });

// Compared against when the account does not exist, so response time does not reveal which emails are registered.
let dummyHash: Promise<string> | undefined;
function getDummyHash() {
  dummyHash ??= hashPassword("not-a-real-password");
  return dummyHash;
}

export async function POST(request: Request) {
  if (!(await getDb())) return jsonError("Sign-in is not configured yet.", 503);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Enter your email and password.", 400);
  const { email, password } = parsed.data;
  if (!(await checkRateLimit(`login:${clientIp(request)}:${normalizeEmail(email)}`, 10, 900))) return jsonError("Too many attempts. Please try again later.", 429);

  const found = await findUserWithPasswordByEmail(email);
  const valid = await verifyPassword(password, found?.passwordHash ?? (await getDummyHash()));
  if (!found || !found.passwordHash || !valid) return jsonError("Incorrect email or password.", 401);
  return sessionResponse(found.user);
}
