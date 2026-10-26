import "./_env";
import { getDb } from "../lib/db";
import { runBatch } from "../lib/question-factory/pipeline";

// LOCAL VERIFICATION ONLY. Builds a small SSC CGL series from the template question generator so the test flow can be
// exercised end to end. The questions are template-made Quantitative Aptitude only; a real series needs expert-reviewed
// questions in all four sections, loaded through the admin or `pnpm questions:import`.
async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") throw new Error("Refusing to seed demo data in production");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not set");

  await runBatch({ exam: "SSC CGL", tier: "Tier I", subject: "Quantitative Aptitude", difficulty: "mixed", count: 40, strategy: "template" }, { db });
  await db.query("update questions set validation_status = 'published' where validation_status = 'auto_passed' and subject = 'Quantitative Aptitude'");

  const exam = (await db.query<{ id: string }>("select id from exams where slug = 'ssc-cgl'")).rows[0];
  const series = (await db.query<{ id: string }>(
    `insert into test_series (exam_id, slug, title, description, price_paise, mrp_paise, status, published_at)
     values ($1, 'ssc-cgl-tier-1-mock-test-series', 'SSC CGL Tier I Mock Test Series', 'Demo series for local verification.', 99900, 199900, 'published', now())
     on conflict (slug) do update set status = 'published' returning id`, [exam.id])).rows[0];

  const questions = (await db.query<{ id: string }>("select id from questions where validation_status = 'published' and exam_id = $1 order by created_at limit 40", [exam.id])).rows;
  const defs = [
    { slug: "free-sample-test", title: "Free Sample Test", free: true, ids: questions.slice(0, 10), minutes: 15, position: 0 },
    { slug: "mock-test-1", title: "Mock Test 1", free: false, ids: questions.slice(10, 30), minutes: 30, position: 1 }
  ];
  for (const def of defs) {
    const test = (await db.query<{ id: string }>(
      `insert into tests (series_id, slug, title, duration_minutes, is_free_sample, position, status, published_at)
       values ($1,$2,$3,$4,$5,$6,'published', now()) on conflict (series_id, slug) do update set status = 'published' returning id`,
      [series.id, def.slug, def.title, def.minutes, def.free, def.position])).rows[0];
    await db.query("delete from test_questions where test_id = $1", [test.id]);
    await db.query("delete from test_sections where test_id = $1", [test.id]);
    const section = (await db.query<{ id: string }>("insert into test_sections (test_id, name, position) values ($1, 'Quantitative Aptitude', 0) returning id", [test.id])).rows[0];
    for (const [index, q] of def.ids.entries()) {
      await db.query("insert into test_questions (test_id, question_id, section_id, position) values ($1,$2,$3,$4)", [test.id, q.id, section.id, index]);
    }
  }
  console.log("Demo series ready: /tests/ssc-cgl/ssc-cgl-tier-1-mock-test-series");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
