import "./_env";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { getDb } from "../lib/db";
import { importQuestions } from "../lib/question-factory/bulk-import";
import { validationStatuses, type ValidationStatus } from "../lib/tests/question-schema";

// Usage: pnpm questions:import ./questions.jsonl [--status needs_review|approved]
// One JSON object per line: { exam, tier?, subject, topic, difficulty, question, options:{A,B,C,D}, correct_answer, explanation, estimated_time_seconds?, source_type? }
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Pass the path of a .jsonl file");
  const statusIndex = process.argv.indexOf("--status");
  const status = (statusIndex >= 0 ? process.argv[statusIndex + 1] : "needs_review") as ValidationStatus;
  if (!["needs_review", "approved"].includes(status) || !validationStatuses.includes(status)) throw new Error("--status must be needs_review or approved (publishing stays a separate step in the admin)");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const summary = await importQuestions(db, createInterface({ input: createReadStream(file), crlfDelay: Infinity }), { status, batchLabel: `import ${file}` });
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
