import "./_env";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createProvider } from "../lib/question-factory/providers";
import { llmCandidates } from "../lib/question-factory/pipeline";
import { makeRng } from "../lib/question-factory/rng";

// Generates the same brief with several models and writes a blind-review sheet plus a separate answer key,
// so reviewers cannot tell which model wrote which question.
// Usage: pnpm factory:benchmark --models anthropic,openai --count 100 --subject "Quantitative Aptitude" --topic Percentage
function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

async function main() {
  const models = (arg("models", "") ?? "").split(",").filter(Boolean);
  if (models.length < 2) throw new Error("--models needs at least two providers, for example anthropic,openai");
  const count = Number(arg("count", "100"));
  const subject = arg("subject", "Quantitative Aptitude")!;
  const topic = arg("topic", "Percentage")!;

  const rows: Array<{ model: string; stem: string; options: Record<string, string>; answer: string; explanation: string }> = [];
  for (const id of models) {
    const provider = createProvider(id);
    const errors: string[] = [];
    const drafts = await llmCandidates({ exam: "SSC CGL", tier: "Tier I", subject, topic, difficulty: "moderate", count, strategy: "llm" }, provider, errors, count);
    console.log(`${id} (${provider.model}): ${drafts.length} valid questions, ${errors.length} rejected`);
    for (const { draft } of drafts) rows.push({ model: `${id}:${provider.model}`, stem: draft.question, options: draft.options, answer: draft.correct_answer, explanation: draft.explanation });
  }

  const shuffled = makeRng(Date.now()).shuffle(rows);
  const dir = join(process.cwd(), ".data", `benchmark-${new Date().toISOString().slice(0, 10)}`);
  mkdirSync(dir, { recursive: true });
  const sheet = ["id,question,A,B,C,D,keyed_answer,explanation,reviewer_accepts(yes/no),reviewer_note"];
  const key = ["id,model"];
  shuffled.forEach((row, index) => {
    const id = `Q${String(index + 1).padStart(3, "0")}`;
    sheet.push([id, csvCell(row.stem), csvCell(row.options.A), csvCell(row.options.B), csvCell(row.options.C), csvCell(row.options.D), row.answer, csvCell(row.explanation), "", ""].join(","));
    key.push(`${id},${csvCell(row.model)}`);
  });
  writeFileSync(join(dir, "blind-review.csv"), sheet.join("\n"));
  writeFileSync(join(dir, "answer-key-do-not-share.csv"), key.join("\n"));
  console.log(`Wrote ${dir}. Give blind-review.csv to the reviewers; keep the key file until they finish, then compare acceptance rate per model.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
