import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

process.env.DATABASE_URL = "pglite://memory://";

async function* lines(items: string[]) {
  for (const item of items) yield item;
}

const draft = (n: number) => JSON.stringify({
  exam: "SSC CGL", subject: "Quantitative Aptitude", topic: "Percentage", difficulty: "easy",
  question: `What is ${n} percent of 200 rupees exactly?`,
  options: { A: `${n * 2}`, B: `${n * 2 + 1}`, C: `${n * 2 + 2}`, D: `${n * 2 + 3}` },
  correct_answer: "A", explanation: `${n}% of 200 is ${n * 2}.`
});

describe("bulk question import", () => {
  beforeAll(async () => {
    const { getDb } = await import("@/lib/db");
    const db = (await getDb())!;
    for (const file of readdirSync(join(process.cwd(), "db/migrations")).sort()) await db.exec(readFileSync(join(process.cwd(), "db/migrations", file), "utf8"));
  });

  it("stores valid rows across batches as needs_review, skips duplicates and reports invalid lines", async () => {
    const { getDb } = await import("@/lib/db");
    const { importQuestions } = await import("@/lib/question-factory/bulk-import");
    const db = (await getDb())!;
    const input = Array.from({ length: 1100 }, (_, i) => draft(i + 1));
    input.push(draft(5), "not json", JSON.stringify({ exam: "SSC CGL" }));
    const summary = await importQuestions(db, lines(input));
    expect(summary.stored).toBe(1100);
    expect(summary.duplicates).toBe(1);
    expect(summary.invalid).toBe(2);
    const counts = await db.query<{ validation_status: string; n: string }>("select validation_status, count(*) as n from questions group by 1");
    expect(counts.rows.map((row) => [row.validation_status, Number(row.n)])).toEqual([["needs_review", 1100]]);

    const again = await importQuestions(db, lines(input.slice(0, 50)));
    expect(again.stored).toBe(0);
    expect(again.duplicates).toBe(50);
  }, 60000);
});
