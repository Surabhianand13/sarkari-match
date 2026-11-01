import { createHash, randomBytes } from "node:crypto";
import type { Db } from "@/lib/db";

// Tokens the collector extension signs in with. A token can only create pending leads; approving stays with a signed-in admin.

export const TOKEN_PREFIX = "smx_";
const MAX_ACTIVE_TOKENS = 10;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type IngestToken = { id: string; label: string; created_at: string; last_used_at: string | null; revoked_at: string | null; created_by_email: string | null };

// The plain token is returned once and never stored.
export async function createIngestToken(db: Db, label: string, actorId: string): Promise<{ id: string; token: string }> {
  const active = await db.query<{ count: string }>("select count(*) from ingest_tokens where revoked_at is null");
  if (Number(active.rows[0].count) >= MAX_ACTIVE_TOKENS) throw new Error(`There are already ${MAX_ACTIVE_TOKENS} active tokens. Revoke one first.`);
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  const { rows } = await db.query<{ id: string }>("insert into ingest_tokens (label, token_hash, created_by) values ($1, $2, $3) returning id", [label.slice(0, 80), hashToken(token), actorId]);
  return { id: rows[0].id, token };
}

export async function listIngestTokens(db: Db): Promise<IngestToken[]> {
  const { rows } = await db.query<IngestToken>(
    `select t.id, t.label, t.created_at::text, t.last_used_at::text, t.revoked_at::text, u.email as created_by_email
     from ingest_tokens t left join users u on u.id = t.created_by order by t.created_at desc`
  );
  return rows;
}

export async function revokeIngestToken(db: Db, id: string) {
  await db.query("update ingest_tokens set revoked_at = now() where id = $1 and revoked_at is null", [id]);
}

// The token must be live and the admin who made it must still be an admin.
export async function authenticateIngestToken(db: Db, authorization: string | null): Promise<{ id: string; label: string } | null> {
  const match = authorization?.match(/^Bearer\s+(smx_[A-Za-z0-9_-]{20,100})$/);
  if (!match) return null;
  const { rows } = await db.query<{ id: string; label: string; last_used_at: string | null }>(
    `select t.id, t.label, t.last_used_at::text
     from ingest_tokens t join users u on u.id = t.created_by and 'admin' = any(u.roles)
     where t.token_hash = $1 and t.revoked_at is null`,
    [hashToken(match[1])]
  );
  const token = rows[0];
  if (!token) return null;
  await db.query("update ingest_tokens set last_used_at = now() where id = $1 and (last_used_at is null or last_used_at < now() - interval '1 minute')", [token.id]);
  return { id: token.id, label: token.label };
}
