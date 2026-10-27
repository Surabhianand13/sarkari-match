import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "pg";

export type QueryResult<T> = { rows: T[]; rowCount: number };

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  // Runs one or more statements without parameters (migrations, seeds).
  exec(sql: string): Promise<void>;
  transaction<R>(fn: (tx: Db) => Promise<R>): Promise<R>;
}

const globalForDb = globalThis as unknown as { __smDb?: Promise<Db | null> };

// Hosted Postgres (Render, Neon, Supabase) needs TLS. A URL that asks for it with sslmode also turns it on.
function shouldUseSsl(url: string) {
  if (process.env.PGSSLMODE === "require") return true;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".render.com") || parsed.hostname.endsWith(".neon.tech") || parsed.hostname.endsWith(".supabase.com") || parsed.hostname.endsWith(".supabase.co") || /^(require|verify-ca|verify-full)$/.test(parsed.searchParams.get("sslmode") ?? "");
  } catch {
    return false;
  }
}

function wrapPool(pool: Pool): Db {
  const wrapClient = (client: PoolClient): Db => ({
    async query<T>(sql: string, params?: unknown[]) {
      const result = await client.query(sql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async exec(sql: string) {
      await client.query(sql);
    },
    transaction: (fn) => fn(wrapClient(client))
  });
  return {
    async query<T>(sql: string, params?: unknown[]) {
      const result = await pool.query(sql, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async transaction<R>(fn: (tx: Db) => Promise<R>) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const value = await fn(wrapClient(client));
        await client.query("commit");
        return value;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

// Local-only zero-setup database: DATABASE_URL=pglite://./.data/dev (embedded Postgres in WASM).
async function openPglite(location: string): Promise<Db> {
  const { PGlite: PGliteDb } = await import("@electric-sql/pglite");
  if (!location.startsWith("memory:")) mkdirSync(dirname(location), { recursive: true });
  const pg = new PGliteDb(location);
  await pg.waitReady;
  type Target = { query: PGlite["query"]; exec: PGlite["exec"] };
  const wrap = (target: Target): Db => ({
    async query<T>(sql: string, params?: unknown[]) {
      const result = await target.query<T>(sql, params as unknown[]);
      return { rows: result.rows, rowCount: result.rows.length > 0 ? result.rows.length : (result.affectedRows ?? 0) };
    },
    async exec(sql: string) {
      await target.exec(sql);
    },
    transaction: (fn) => fn(wrap(target))
  });
  return {
    ...wrap(pg),
    transaction: (fn) => pg.transaction(async (tx) => fn(wrap(tx as unknown as Target)))
  };
}

async function open(): Promise<Db | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (url.startsWith("pglite:")) return openPglite(url.replace(/^pglite:\/\//, "").replace(/^pglite:/, "") || "memory://");
  const pool = new Pool({
    connectionString: url,
    ssl: shouldUseSsl(url) ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true
  });
  // Serverless Postgres (Neon) closes idle connections when it scales to zero. Without a listener that would crash the process.
  pool.on("error", (error) => console.warn("Idle database connection closed:", error.message));
  return wrapPool(pool);
}

// Returns null when DATABASE_URL is not configured so public pages can fall back to demo data.
export function getDb(): Promise<Db | null> {
  if (!globalForDb.__smDb) globalForDb.__smDb = open();
  return globalForDb.__smDb;
}
