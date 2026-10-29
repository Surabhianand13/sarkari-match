import type { Db } from "@/lib/db";
import { pendingByStage } from "./queue";

export const stageLabels: Array<{ id: string; label: string; detail: string }> = [
  { id: "write", label: "Writers", detail: "Draft new questions" },
  { id: "solve", label: "Solvers", detail: "Answer them independently" },
  { id: "language", label: "Spelling and grammar", detail: "Fix wording" },
  { id: "syllabus", label: "Syllabus and level", detail: "Check relevance" },
  { id: "dedupe", label: "Repeat checker", detail: "Catch duplicates" },
  { id: "fix", label: "Fixer", detail: "Repair rejected ones" }
];

// Where a question waits for each stage. The fixer's queue is its own stage; the others use the stage name.
const queueStage: Record<string, string> = { fix: "fixing" };

export type StageStats = { id: string; label: string; detail: string; waiting: number; passed: number; fixed: number; rejected: number; review: number; askingAi: number };

export type Snapshot = {
  batch: { id: string; status: string; subject: string; topic: string | null; requested: number; mode: string; started: string; finished: string | null; error: string | null };
  totals: { written: number; autoPassed: number; needsReview: number; rejected: number; inFlight: number };
  stages: StageStats[];
  events: Array<{ id: number; at: string; stage: string; outcome: string; message: string }>;
  tasks: Record<string, number>;
};

export async function batchSnapshot(db: Db, batchId: string): Promise<Snapshot | null> {
  const batch = await db.query<{ id: string; status: string; subject: string; topic: string | null; requested_count: number; config: { mode?: string }; created_at: string; finished_at: string | null; error_message: string | null }>(
    "select id, status, subject, topic, requested_count, config, created_at::text, finished_at::text, error_message from question_batches where id = $1",
    [batchId]
  );
  const row = batch.rows[0];
  if (!row) return null;

  const [queue, events, outcomes, totals, tasks] = await Promise.all([
    db.query<{ stage: string; n: number; asking: number }>(
      "select pipeline_stage as stage, count(*)::int as n, count(*) filter (where waiting_ai)::int as asking from questions where batch_id = $1 and pipeline_stage is not null and pipeline_stage <> 'done' group by pipeline_stage",
      [batchId]
    ),
    db.query<{ id: number; at: string; stage: string; outcome: string; message: string }>("select id, created_at::text as at, stage, outcome, message from factory_events where batch_id = $1 order by id desc limit 14", [batchId]),
    db.query<{ stage: string; outcome: string; n: number }>("select stage, outcome, count(*)::int as n from factory_events where batch_id = $1 and question_id is not null group by stage, outcome", [batchId]),
    db.query<{ written: number; auto_passed: number; needs_review: number; rejected: number; in_flight: number }>(
      `select count(*)::int as written,
         count(*) filter (where validation_status = 'auto_passed')::int as auto_passed,
         count(*) filter (where validation_status = 'needs_review')::int as needs_review,
         count(*) filter (where validation_status in ('auto_failed', 'rejected'))::int as rejected,
         count(*) filter (where pipeline_stage is not null and pipeline_stage <> 'done')::int as in_flight
       from questions where batch_id = $1`,
      [batchId]
    ),
    pendingByStage(db, batchId)
  ]);

  const stages: StageStats[] = stageLabels.map((stage) => {
    const q = queue.rows.find((item) => item.stage === (queueStage[stage.id] ?? stage.id));
    const count = (outcome: string) => outcomes.rows.filter((item) => item.stage === stage.id && item.outcome === outcome).reduce((sum, item) => sum + item.n, 0);
    return {
      ...stage,
      waiting: stage.id === "write" ? 0 : q?.n ?? 0,
      askingAi: stage.id === "write" ? tasks.write ?? 0 : q?.asking ?? 0,
      passed: stage.id === "write" ? totals.rows[0].written : count("passed"),
      fixed: count("fixed"),
      rejected: count("rejected"),
      review: count("review")
    };
  });

  const t = totals.rows[0];
  return {
    batch: { id: row.id, status: row.status, subject: row.subject, topic: row.topic, requested: row.requested_count, mode: row.config?.mode ?? "rules", started: row.created_at, finished: row.finished_at, error: row.error_message },
    totals: { written: t.written, autoPassed: t.auto_passed, needsReview: t.needs_review, rejected: t.rejected, inFlight: t.in_flight },
    stages,
    events: events.rows,
    tasks
  };
}
