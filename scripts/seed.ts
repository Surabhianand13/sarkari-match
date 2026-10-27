import "./_env";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "../lib/db";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const dir = join(process.cwd(), "db", "seed");
  // Sample notifications are for local development only. Set SEED_SAMPLES=true to load them.
  const withSamples = process.env.SEED_SAMPLES === "true";
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    if (file.includes("sample") && !withSamples) {
      console.log(`skipped ${file} (set SEED_SAMPLES=true for local sample data)`);
      continue;
    }
    await db.exec(readFileSync(join(dir, file), "utf8"));
    console.log(`seeded ${file}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
