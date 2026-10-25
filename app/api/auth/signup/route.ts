import { z } from "zod";
import { clientIp, jsonError, readJson, sessionResponse } from "@/lib/auth/http";
import { hashPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createUser, findUserWithPasswordByEmail } from "@/lib/auth/users";
import { getDb } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(20).optional(),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  if (!(await getDb())) return jsonError("Sign-up is not configured yet.", 503);
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Enter your name, a valid email and a password of at least 8 characters.", 400);
  if (!(await checkRateLimit(`signup:${clientIp(request)}`, 10, 3600))) return jsonError("Too many attempts. Please try again later.", 429);

  const { name, email, phone, password } = parsed.data;
  if (await findUserWithPasswordByEmail(email)) return jsonError("An account with this email already exists. Try signing in.", 409);

  const user = await createUser({ email, passwordHash: await hashPassword(password), fullName: name, phone: phone || undefined });
  if (!user) return jsonError("Could not create the account.", 500);
  return sessionResponse(user, 201);
}
