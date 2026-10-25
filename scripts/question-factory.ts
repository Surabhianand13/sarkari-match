import "./_env";
import { getDb } from "../lib/db";
import { createProvider } from "../lib/question-factory/providers";
import { runBatch, type FactoryInput } from "../lib/question-factory/pipeline";

// Usage:
//   pnpm factory --subject "Quantitative Aptitude" --count 200 --strategy template
//   pnpm factory --subject "Quantitative Aptitude" --topic Percentage --count 50 --strategy llm --generator anthropic --solver openai
function arg(name: string, fallback?: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");
  const strategy = (arg("strategy", "template") as FactoryInput["strategy"]);
  const generatorId = arg("generator");
  const solverId = arg("solver");
  if (strategy === "llm" && !generatorId) throw new Error("--generator is required for the llm strategy (anthropic, openai or gemini)");
  if (generatorId && solverId && generatorId === solverId) console.warn("Warning: generator and solver are the same provider; a different model gives a more independent check.");

  const summary = await runBatch(
    {
      exam: arg("exam", "SSC CGL")!,
      tier: arg("tier", "Tier I"),
      subject: arg("subject", "Quantitative Aptitude")!,
      topic: arg("topic"),
      difficulty: arg("difficulty", "mixed") as FactoryInput["difficulty"],
      count: Number(arg("count", "20")),
      strategy
    },
    { db, generator: generatorId ? createProvider(generatorId) : undefined, solver: solverId ? createProvider(solverId) : undefined }
  );
  console.log(JSON.stringify(summary, null, 2));
  console.log("Next: review the questions in /admin/questions. Nothing has been published.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
