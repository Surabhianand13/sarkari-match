import { getDb } from "@/lib/db";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  roles: string[];
};

type UserRow = { id: string; email: string; full_name: string | null; roles: string[]; password_hash: string | null };

function toSessionUser(row: UserRow): SessionUser {
  return { id: row.id, email: row.email, fullName: row.full_name, roles: row.roles ?? [] };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findUserWithPasswordByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<UserRow>("select id, email, full_name, roles, password_hash from users where lower(email) = $1", [normalizeEmail(email)]);
  return rows[0] ? { user: toSessionUser(rows[0]), passwordHash: rows[0].password_hash } : null;
}

export async function findUserById(id: string): Promise<SessionUser | null> {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<UserRow>("select id, email, full_name, roles, password_hash from users where id = $1", [id]);
  return rows[0] ? toSessionUser(rows[0]) : null;
}

export async function createUser(input: { email: string; passwordHash: string | null; fullName?: string; phone?: string; roles?: string[]; emailVerified?: boolean }): Promise<SessionUser | null> {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<UserRow>(
    `insert into users (email, password_hash, full_name, phone, roles, email_verified_at)
     values ($1, $2, $3, $4, $5, $6)
     returning id, email, full_name, roles, password_hash`,
    [normalizeEmail(input.email), input.passwordHash, input.fullName ?? null, input.phone ?? null, input.roles ?? [], input.emailVerified ? new Date().toISOString() : null]
  );
  return toSessionUser(rows[0]);
}
