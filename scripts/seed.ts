import "./_env";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "../lib/db";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const dir = join(process.cwd(), "db", "seed");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
    console.log(`seeded ${file}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
