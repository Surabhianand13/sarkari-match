import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { findUserById, type SessionUser } from "@/lib/auth/users";
import { getDb } from "@/lib/db";

export async function getOptionalUser(): Promise<SessionUser | null> {
  // Reading cookies first opts the calling page out of static rendering, whatever the environment.
  const store = await cookies();
  const db = await getDb();
  if (!db) return null;
  const claims = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!claims) return null;
  return findUserById(claims.sub);
}

export async function requireUser(): Promise<SessionUser> {
  await cookies();
  const db = await getDb();
  if (!db) {
    if (process.env.NODE_ENV !== "production") return demoUser();
    redirect("/login");
  }
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.roles.includes("admin")) redirect("/dashboard");
  return user;
}

function demoUser(): SessionUser {
  return { id: "00000000-0000-4000-8000-000000000001", email: "demo@example.com", fullName: "Demo User", roles: ["admin"] };
}
