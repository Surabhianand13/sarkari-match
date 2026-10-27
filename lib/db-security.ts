import type { Db } from "@/lib/db";

// Hosted Postgres such as Supabase publishes the `public` schema through a web API that anyone holding the project's public key can call.
// Our app talks to the database directly, never through that API, so every table is locked for those API roles: row level security
// is switched on with no policies (the app's own login is the table owner and is not affected) and their privileges are removed.
// Safe to run on every deploy and on any Postgres: the API roles are only touched where they exist.
export async function lockdownPublicTables(db: Db): Promise<{ secured: number }> {
  const unsecured = await db.query<{ tablename: string }>("select tablename from pg_tables where schemaname = 'public' and not rowsecurity");
  for (const row of unsecured.rows) await db.query(`alter table public."${row.tablename.replace(/"/g, '""')}" enable row level security`);
  await db.exec(`
    do $$
    declare api_role text;
    begin
      foreach api_role in array array['anon', 'authenticated'] loop
        if exists (select 1 from pg_roles where rolname = api_role) then
          execute format('revoke all on all tables in schema public from %I', api_role);
          execute format('revoke all on all sequences in schema public from %I', api_role);
          execute format('revoke all on all functions in schema public from %I', api_role);
          execute format('alter default privileges in schema public revoke all on tables from %I', api_role);
          execute format('alter default privileges in schema public revoke all on sequences from %I', api_role);
          execute format('alter default privileges in schema public revoke all on functions from %I', api_role);
        end if;
      end loop;
    end $$;
  `);
  return { secured: unsecured.rows.length };
}
