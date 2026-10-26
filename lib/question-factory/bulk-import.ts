import type { Db } from "@/lib/db";
import { contentHash, questionDraftSchema, type QuestionDraft, type ValidationStatus } from "@/lib/tests/question-schema";

export type ImportSummary = { read: number; stored: number; duplicates: number; invalid: number; sampleErrors: string[] };

const BATCH_SIZE = 500;

async function examIdFor(db: Db, cache: Map<string, string>, name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const cached = cache.get(slug);
  if (cached) return cached;
  const found = await db.query<{ id: string }>("select id from exams where slug = $1", [slug]);
  const id = found.rows[0]?.id ?? (await db.query<{ id: string }>("insert into exams (slug, name) values ($1, $2) returning id", [slug, name])).rows[0].id;
  cache.set(slug, id);
  return id;
}

// Loads question drafts (one JSON object per line) in batches so lakhs of rows import quickly. Exact duplicates are skipped
// via content_hash. Imported questions default to needs_review: nothing reaches learners without a person approving it.
export async function importQuestions(db: Db, lines: AsyncIterable<string>, options: { status?: ValidationStatus; batchLabel?: string } = {}): Promise<ImportSummary> {
  const status = options.status ?? "needs_review";
  const summary: ImportSummary = { read: 0, stored: 0, duplicates: 0, invalid: 0, sampleErrors: [] };
  const exams = new Map<string, string>();
  const batch = await db.query<{ id: string }>(
    `insert into question_batches (exam_slug, subject, requested_count, config, status) values (null, $1, 0, $2, 'running') returning id`,
    [options.batchLabel ?? "bulk import", JSON.stringify({ import: true })]
  );
  const batchId = batch.rows[0].id;
  let pending: Array<{ draft: QuestionDraft; examId: string; hash: string }> = [];

  async function flush() {
    if (!pending.length) return;
    // Hashes repeated inside one batch would make the insert conflict with itself, so keep the first of each.
    const unique = [...new Map(pending.map((row) => [row.hash, row])).values()];
    summary.duplicates += pending.length - unique.length;
    const values: unknown[] = [];
    const tuples = unique.map((row, index) => {
      const base = index * 13;
      values.push(row.examId, row.draft.tier ?? null, row.draft.subject, row.draft.topic, row.draft.difficulty, row.draft.question, JSON.stringify(row.draft.options),
        row.draft.correct_answer, row.draft.explanation, row.draft.estimated_time_seconds, row.draft.source_type === "original_ai_generated" ? "imported" : row.draft.source_type, row.hash, batchId);
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},'${status}',$${base + 12},$${base + 13})`;
    });
    const result = await db.query(
      `insert into questions (exam_id, tier, subject, topic, difficulty, stem, options, correct_option, explanation, est_time_seconds, source_type, validation_status, content_hash, batch_id)
       values ${tuples.join(",")} on conflict (content_hash) do nothing`,
      values
    );
    summary.stored += result.rowCount ?? 0;
    summary.duplicates += unique.length - (result.rowCount ?? 0);
    pending = [];
  }

  for await (const line of lines) {
    if (!line.trim()) continue;
    summary.read++;
    let parsed;
    try {
      parsed = questionDraftSchema.safeParse(JSON.parse(line));
    } catch {
      parsed = null;
    }
    if (!parsed?.success) {
      summary.invalid++;
      if (summary.sampleErrors.length < 5) summary.sampleErrors.push(`line ${summary.read}: ${parsed ? parsed.error.issues[0]?.message : "not valid JSON"}`);
      continue;
    }
    pending.push({ draft: parsed.data, examId: await examIdFor(db, exams, parsed.data.exam), hash: contentHash(parsed.data) });
    if (pending.length >= BATCH_SIZE) await flush();
  }
  await flush();
  await db.query("update question_batches set status = 'completed', generated_count = $2, finished_at = now() where id = $1", [batchId, summary.stored]);
  return summary;
}
