import type { Db } from "@/lib/db";

export async function writeAudit(db: Db, entry: { actorId: string; action: string; entityType: string; entityId?: string | null; before?: unknown; after?: unknown }) {
  await db.query(
    "insert into audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state) values ($1, $2, $3, $4, $5, $6)",
    [
      entry.actorId.startsWith("00000000-0000-4000") ? null : entry.actorId,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.before === undefined ? null : JSON.stringify(entry.before),
      entry.after === undefined ? null : JSON.stringify(entry.after)
    ]
  );
}
