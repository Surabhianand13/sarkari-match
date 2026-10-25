import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/users";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<unknown | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function sessionResponse(user: SessionUser, status = 200) {
  const response = NextResponse.json({ user: publicUser(user) }, { status });
  response.cookies.set(SESSION_COOKIE, await signSession({ sub: user.id, email: user.email }), sessionCookieOptions());
  return response;
}

export function publicUser(user: SessionUser) {
  return { id: user.id, email: user.email, fullName: user.fullName, roles: user.roles };
}
