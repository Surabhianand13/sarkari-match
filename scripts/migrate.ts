import "./_env";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "../lib/db";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const applied = new Set((await db.query<{ name: string }>("select name from schema_migrations")).rows.map((row) => row.name));
  const dir = join(process.cwd(), "db", "migrations");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), "utf8");
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("insert into schema_migrations (name) values ($1)", [file]);
    });
    console.log(`applied ${file}`);
  }
  console.log("migrations up to date");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
