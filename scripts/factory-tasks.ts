import "./_env";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getDb } from "../lib/db";
import { advanceBatch } from "../lib/question-factory/engine";
import { aiForConfig } from "../lib/question-factory/runtime";
import { answerTasks, parseChatAnswers, pendingTasks } from "../lib/question-factory/queue";

// Works the chat queue from a terminal, for when a Claude Code session answers the tasks.
//   pnpm factory:tasks list --batch <id> [--stage solve] [--limit 40] [--out .data/factory-tasks.json]
//   pnpm factory:tasks answer <answers.json> --by claude      (answers.json: [{"id": "...", "response": {...}}])
//   pnpm factory:tasks advance --batch <id>                   (runs the stages that are unblocked)
function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const command = process.argv[2];

  if (command === "list") {
    const tasks = await pendingTasks(db, { batchId: arg("batch"), stage: arg("stage"), limit: Number(arg("limit", "40")) });
    const out = arg("out", ".data/factory-tasks.json")!;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, JSON.stringify(tasks.map((task) => ({ id: task.id, stage: task.stage, system: task.request.system, prompt: task.request.prompt })), null, 1));
    console.log(`${tasks.length} pending tasks written to ${out}`);
  } else if (command === "answer") {
    const file = process.argv[3];
    if (!file) throw new Error("Give the answers file: pnpm factory:tasks answer answers.json --by claude");
    const result = await answerTasks(db, parseChatAnswers(readFileSync(file, "utf8")), arg("by", "claude")!);
    console.log(`${result.applied} answers applied, ${result.unknown} did not match an open task`);
  } else if (command === "advance") {
    const id = arg("batch");
    if (!id) throw new Error("--batch is required");
    const found = await db.query<{ config: { mode?: string; provider?: string } }>("select config from question_batches where id = $1", [id]);
    if (!found.rows[0]) throw new Error("No such run");
    const batch = await advanceBatch(db, aiForConfig(db, found.rows[0].config), id, { budgetMs: 60000 });
    console.log(`run is ${batch?.status}`);
  } else {
    console.log("Commands: list, answer, advance");
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
