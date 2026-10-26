import "./_env";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "../lib/db";

// Loads only the starter blog articles (safe to run repeatedly; existing slugs are left alone).
async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  await db.exec(readFileSync(join(process.cwd(), "db", "seed", "0004_blog_starter.sql"), "utf8"));
  const rows = await db.query<{ slug: string; status: string }>("select slug, status from blog_posts order by created_at");
  console.log(rows.rows);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
