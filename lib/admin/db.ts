import { getDb, type Db } from "@/lib/db";

// Admin pages only render when a database is configured (the admin layout checks), so this never returns null there.
export async function adminDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  return db;
}

export function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// Friendly text for common Postgres constraint errors.
export function friendlyDbError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "23505") return "That slug or value already exists. Pick a different one.";
  if (code === "23503") return "That record is still referenced elsewhere, or the selected parent does not exist.";
  if (code === "23514") return "One of the values is outside the allowed range.";
  return messageFrom(error);
}
