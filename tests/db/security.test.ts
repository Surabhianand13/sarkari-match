import { describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

describe("lockdownPublicTables", () => {
  it("turns on row level security for every public table, once, and removes API-role access where those roles exist", async () => {
    const { getDb } = await import("@/lib/db");
    const { lockdownPublicTables } = await import("@/lib/db-security");
    const db = (await getDb())!;
    await db.exec("create table public.users_test (id int primary key, secret text); create table public.other_test (id int)");
    await db.exec("create role anon nologin; grant select on all tables in schema public to anon");
    expect((await db.query<{ ok: boolean }>("select has_table_privilege('anon', 'public.users_test', 'select') as ok")).rows[0].ok).toBe(true);

    const first = await lockdownPublicTables(db);
    expect(first.secured).toBe(2);
    const open = await db.query("select tablename from pg_tables where schemaname = 'public' and not rowsecurity");
    expect(open.rows).toHaveLength(0);
    expect((await db.query<{ ok: boolean }>("select has_table_privilege('anon', 'public.users_test', 'select') as ok")).rows[0].ok).toBe(false);

    // The app's own login still reads and writes.
    await db.query("insert into public.users_test (id, secret) values (1, 'x')");
    expect((await db.query("select * from public.users_test")).rows).toHaveLength(1);

    // Idempotent, and picks up tables created later.
    await db.exec("create table public.later_test (id int)");
    expect((await lockdownPublicTables(db)).secured).toBe(1);
    expect((await lockdownPublicTables(db)).secured).toBe(0);
  });
});
