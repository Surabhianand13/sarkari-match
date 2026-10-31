import type { Db } from "@/lib/db";
import { findNearDuplicate } from "./dedupe";
import { examSlug, knowledgeFor, topicInSyllabus, type Knowledge } from "./knowledge";
import { proofread } from "./language-rules";
import { alwaysHumanCheck, ensureExam, parseJsonObject, templateCandidates, type Candidate, type FactoryInput } from "./pipeline";
import { PROMPT_VERSION, fixPrompt, generationPrompt, reviewPrompt, solverPrompt } from "./prompts";
import type { LlmProvider } from "./providers/types";
import type { Difficulty } from "./templates";
import { isExplanationReason, isNumericSubject, runCodeValidation, type ValidationCheck } from "./validator";
import { contentHash, optionKeys, questionDraftSchema, type OptionKey, type QuestionDraft, type ValidationStatus } from "@/lib/tests/question-schema";

// The factory as a set of stage workers. A question is written, then solved independently, proofread, checked against the
// syllabus and past papers, checked for repeats, and sent to a fixer whenever a check fails. Every stage can run on a
// provider API, or on a work queue that a person answers from any AI chat (so a subscription is enough to start).

export type AiMode = "rules" | "queue" | "api";

export class AwaitingAi extends Error {
  constructor() {
    super("Waiting for an AI answer");
  }
}

export type AiRequest = { system: string; prompt: string };
export type AiContext = { batchId: string; questionId: string | null; stage: string; key: string };
export type AiPort = { mode: AiMode; model: string; complete(context: AiContext, request: AiRequest): Promise<string> };

export const rulesAi: AiPort = {
  mode: "rules",
  model: "rules",
  complete: async () => {
    throw new Error("No AI is configured for this run.");
  }
};

export function apiAi(provider: LlmProvider): AiPort {
  return { mode: "api", model: provider.model, complete: (_context, request) => provider.completeJson(request) };
}

// Queue mode stores the request and stops. Once a person has answered it (see queue.ts), the same call returns the answer.
export function queueAi(db: Db): AiPort {
  return {
    mode: "queue",
    model: "chat-queue",
    async complete(context, request) {
      const found = await db.query<{ status: string; response: string | null }>("select status, response from factory_tasks where batch_id = $1 and task_key = $2", [context.batchId, context.key]);
      const row = found.rows[0];
      if (row && row.status !== "pending" && row.response !== null) return row.response;
      if (!row) {
        await db.query(
          "insert into factory_tasks (batch_id, question_id, stage, task_key, request) values ($1, $2, $3, $4, $5) on conflict (batch_id, task_key) do nothing",
          [context.batchId, context.questionId, context.stage, context.key, JSON.stringify(request)]
        );
      }
      throw new AwaitingAi();
    }
  };
}

export type RunInput = {
  exam: string;
  tier: string;
  subject: string;
  topic?: string;
  difficulty: Difficulty | "mixed";
  count: number;
  mode: AiMode;
  provider?: string;
  createdBy?: string | null;
};

type BatchConfig = { mode: AiMode; strategy: "template" | "llm"; examName: string; tier: string; provider?: string; recheck?: boolean };

export type Batch = {
  id: string;
  status: string;
  exam_slug: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  requested_count: number;
  write_calls: number;
  config: BatchConfig;
};

type Solver = { model: string; answer: string | null; agrees: boolean; ambiguous: boolean; reasoning?: string };

type Notes = {
  checks?: ValidationCheck[];
  verification_expression?: string | null;
  template?: { name: string; seed: number };
  proven?: boolean;
  solver?: Solver | null;
  language?: { fixes: string[]; issues: string[] };
  syllabus?: { in_syllabus: boolean | null; level?: string; reason?: string; sources: string[] };
  review?: { in_syllabus?: boolean; level?: string; reason?: string };
  flags?: string[];
  reasons?: string[];
  fix_history?: string[];
  recheck?: { previous_status: string; previous_batch: string | null };
  error?: string;
};

type Row = {
  id: string;
  subject: string;
  topic: string;
  tier: string | null;
  difficulty: Difficulty;
  stem: string;
  options: Record<OptionKey, string>;
  correct_option: OptionKey;
  explanation: string;
  est_time_seconds: number;
  validation_notes: Notes;
  fix_attempts: number;
  pipeline_stage: string;
};

type Env = { db: Db; ai: AiPort; batch: Batch; knowledge: () => Promise<Knowledge> };

export const MAX_FIXES = 2;
const WRITE_CHUNK = { api: 5, queue: 10, rules: 50 } as const;
const WRITE_PARALLEL_QUEUE = 8;
const STAGE_PRIORITY = ["fixing", "dedupe", "syllabus", "language", "solve"] as const;

export type Outcome = "passed" | "fixed" | "rejected" | "review" | "info" | "error";

async function logEvent(db: Db, batchId: string, questionId: string | null, stage: string, outcome: Outcome, message: string) {
  await db.query("insert into factory_events (batch_id, question_id, stage, outcome, message) values ($1, $2, $3, $4, $5)", [batchId, questionId, stage, outcome, message]);
}

function ctx(env: Env, row: Row, stage: string): AiContext {
  return { batchId: env.batch.id, questionId: row.id, stage, key: `${stage}:${row.id}:${row.fix_attempts}` };
}

function rowDraft(env: Env, row: Row): QuestionDraft {
  return {
    exam: env.batch.config.examName,
    tier: row.tier ?? undefined,
    subject: row.subject,
    topic: row.topic,
    difficulty: row.difficulty,
    question: row.stem,
    options: row.options,
    correct_answer: row.correct_option,
    explanation: row.explanation,
    estimated_time_seconds: row.est_time_seconds,
    source_type: "original_ai_generated"
  };
}

type Save = { stage?: string; status?: ValidationStatus; notes?: Notes; draft?: QuestionDraft; fixAttempts?: number; waiting?: boolean };

// Writes one question's progress. Edits to the wording also refresh the content hash; a hash that already exists
// means the edit made this question identical to another one, which counts as a duplicate.
async function save(env: Env, row: Row, change: Save): Promise<"saved" | "duplicate"> {
  const sets: string[] = ["claimed_at = null", "updated_at = now()"];
  const values: unknown[] = [row.id];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (change.stage !== undefined) add("pipeline_stage", change.stage);
  if (change.status !== undefined) add("validation_status", change.status);
  if (change.notes !== undefined) add("validation_notes", JSON.stringify(change.notes));
  if (change.fixAttempts !== undefined) add("fix_attempts", change.fixAttempts);
  if (change.waiting !== undefined) add("waiting_ai", change.waiting);
  if (change.draft) {
    add("stem", change.draft.question);
    add("options", JSON.stringify(change.draft.options));
    add("correct_option", change.draft.correct_answer);
    add("explanation", change.draft.explanation);
    add("est_time_seconds", change.draft.estimated_time_seconds);
    add("content_hash", contentHash(change.draft));
  }
  try {
    await env.db.query(`update questions set ${sets.join(", ")} where id = $1`, values);
    return "saved";
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
    await env.db.query(
      "update questions set claimed_at = null, validation_status = 'rejected', pipeline_stage = 'done', validation_notes = $2, updated_at = now() where id = $1",
      [row.id, JSON.stringify({ ...row.validation_notes, error: "After an edit this question became identical to another one." })]
    );
    return "duplicate";
  }
}

function finish(env: Env, row: Row, status: ValidationStatus, notes: Notes) {
  return save(env, row, { stage: "done", status, notes });
}

function readSolver(raw: string, correct: OptionKey, model: string): Solver {
  const reply = parseJsonObject(raw) as { answer?: unknown; reasoning?: unknown; ambiguous?: unknown };
  const answer = typeof reply.answer === "string" ? reply.answer.trim().toUpperCase().slice(0, 1) : null;
  const known = optionKeys.includes(answer as OptionKey) ? answer : null;
  return { model, answer: known, agrees: known === correct, ambiguous: Boolean(reply.ambiguous), reasoning: typeof reply.reasoning === "string" ? reply.reasoning : undefined };
}

function wordOverlap(a: string, b: string) {
  const left = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const right = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  const union = left.size + right.size - shared;
  return union === 0 ? 1 : shared / union;
}

async function failOrFix(env: Env, row: Row, stage: string, reasons: string[], notes: Notes) {
  if (env.ai.mode !== "rules" && row.fix_attempts < MAX_FIXES) {
    await save(env, row, { stage: "fixing", notes: { ...notes, reasons } });
    await logEvent(env.db, env.batch.id, row.id, stage, "rejected", `${reasons[0]} Sent to the fixer.`);
    return;
  }
  await finish(env, row, "auto_failed", { ...notes, reasons });
  await logEvent(env.db, env.batch.id, row.id, stage, "rejected", reasons.join(" "));
}

async function solveStage(env: Env, row: Row) {
  const notes = row.validation_notes;
  const draft = rowDraft(env, row);
  const { checks, conclusive } = runCodeValidation(draft, notes.verification_expression);
  const proven = Boolean(notes.template) && conclusive;
  const reasons = checks.filter((check) => !check.passed).map((check) => `${check.detail ?? check.name}`.replace(/\.?$/, "."));

  let solver: Solver | null = null;
  if (!reasons.length && env.ai.mode !== "rules" && !proven) {
    solver = readSolver(await env.ai.complete(ctx(env, row, "solve"), solverPrompt(draft.question, draft.options)), draft.correct_answer, env.ai.model);
    if (!solver.agrees) reasons.push(`An independent solver chose ${solver.answer ?? "no option"} but the key says ${draft.correct_answer}.`);
    else if (solver.ambiguous) reasons.push("The independent solver found more than one defensible answer.");
  }
  const next: Notes = { ...notes, checks, solver, proven };
  if (reasons.length) return failOrFix(env, row, "solve", reasons, next);
  await save(env, row, { stage: "language", notes: next });
  await logEvent(env.db, env.batch.id, row.id, "solve", "passed", proven ? "Answer proven by exact arithmetic." : solver ? "An independent solver reached the same answer." : "Code checks passed.");
}

async function languageStage(env: Env, row: Row) {
  const fixes: string[] = [];
  const issues: string[] = [];
  const stem = proofread(row.stem);
  const explanation = proofread(row.explanation);
  const options = { ...row.options };
  for (const key of optionKeys) {
    const result = proofread(row.options[key], { capitalise: false });
    options[key] = result.text;
    fixes.push(...result.fixes);
    issues.push(...result.issues);
  }
  let question = stem.text;
  let steps = explanation.text;
  fixes.push(...stem.fixes, ...explanation.fixes);
  issues.push(...stem.issues, ...explanation.issues);

  let review: Notes["review"];
  if (env.ai.mode !== "rules") {
    const knowledge = await env.knowledge();
    const reply = parseJsonObject(
      await env.ai.complete(
        ctx(env, row, "review"),
        reviewPrompt({ exam: env.batch.config.examName, tier: row.tier ?? env.batch.config.tier, subject: row.subject, topic: row.topic, difficulty: row.difficulty, question, options, explanation: steps, syllabus: knowledge.syllabus })
      )
    ) as { ok?: unknown; issues?: unknown; question?: unknown; explanation?: unknown; steps_ok?: unknown; step_errors?: unknown; in_syllabus?: unknown; level?: unknown; reason?: unknown };
    // A reviewer who found a wrong step sends the question to the fixer; wording edits alone are never trusted to repair it.
    if (reply.steps_ok === false) {
      const errors = Array.isArray(reply.step_errors) ? reply.step_errors.map(String).filter(Boolean) : [];
      return failOrFix(env, row, "review", [`The reviewer found an error in the explanation: ${errors.length ? errors.join("; ") : "a step is wrong."}`], { ...row.validation_notes, flags: [...(row.validation_notes.flags ?? [])] });
    }
    // Only small edits are accepted: this stage may fix wording, never change what is asked.
    if (typeof reply.question === "string" && reply.question.trim() !== question && wordOverlap(reply.question, question) >= 0.7) {
      question = reply.question.trim();
      fixes.push("wording improved");
    }
    if (typeof reply.explanation === "string" && reply.explanation.trim() !== steps && wordOverlap(reply.explanation, steps) >= 0.7) {
      steps = reply.explanation.trim();
      fixes.push("explanation wording improved");
    }
    if (reply.ok === false) issues.push(...(Array.isArray(reply.issues) && reply.issues.length ? reply.issues.map(String) : ["The wording is unclear."]));
    review = {
      in_syllabus: typeof reply.in_syllabus === "boolean" ? reply.in_syllabus : undefined,
      level: typeof reply.level === "string" ? reply.level : undefined,
      reason: typeof reply.reason === "string" ? reply.reason : undefined
    };
  }

  const changed = question !== row.stem || steps !== row.explanation || optionKeys.some((key) => options[key] !== row.options[key]);
  const notes: Notes = { ...row.validation_notes, review, language: { fixes: [...new Set(fixes)], issues }, flags: [...(row.validation_notes.flags ?? []), ...issues.map((issue) => `Language: ${issue}`)] };
  const draft: QuestionDraft = { ...rowDraft(env, row), question, options, explanation: steps };
  const result = await save(env, row, changed ? { stage: "syllabus", notes, draft } : { stage: "syllabus", notes });
  if (result === "duplicate") return logEvent(env.db, env.batch.id, row.id, "language", "rejected", "After proofreading this became identical to another question.");
  if (changed) await logEvent(env.db, env.batch.id, row.id, "language", "fixed", `Fixed: ${[...new Set(fixes)].join(", ")}.`);
  else await logEvent(env.db, env.batch.id, row.id, "language", "passed", issues.length ? `Needs a person: ${issues[0]}` : "Spelling and wording are clean.");
}

async function syllabusStage(env: Env, row: Row) {
  const knowledge = await env.knowledge();
  const flags = [...(row.validation_notes.flags ?? [])];

  const copied = findNearDuplicate(row.stem, knowledge.pyqs, 0.7);
  if (copied) {
    await finish(env, row, "rejected", { ...row.validation_notes, error: "Too close to a past paper question." });
    return logEvent(env.db, env.batch.id, row.id, "syllabus", "rejected", `Too close to a past paper question (${Math.round(copied.score * 100)}% similar).`);
  }

  const inSyllabus = topicInSyllabus(knowledge.syllabus, row.topic);
  if (inSyllabus === false) flags.push("Syllabus: the topic is not found in the uploaded syllabus.");
  if (knowledge.currentAffairsStale && alwaysHumanCheck.includes(row.subject.trim().toLowerCase())) flags.push("Facts: the current affairs source is over a year old.");

  // The AI part of this check was answered together with the proofreading, in the review task.
  const review = row.validation_notes.review;
  const level = review?.level;
  const reason = review?.reason;
  if (review?.in_syllabus === false) {
    await finish(env, row, "auto_failed", { ...row.validation_notes, syllabus: { in_syllabus: false, level, reason, sources: knowledge.sourceTitles }, reasons: [`Outside the syllabus. ${reason ?? ""}`.trim()] });
    return logEvent(env.db, env.batch.id, row.id, "syllabus", "rejected", `Outside the syllabus. ${reason ?? ""}`.trim());
  }
  if (level === "harder") flags.push(`Level: looks harder than intended. ${reason ?? ""}`.trim());

  await save(env, row, { stage: "dedupe", notes: { ...row.validation_notes, flags, syllabus: { in_syllabus: inSyllabus, level, reason, sources: knowledge.sourceTitles } } });
  await logEvent(env.db, env.batch.id, row.id, "syllabus", "passed", inSyllabus === null && !knowledge.pyqs.length ? "No syllabus or past papers on file for this subject." : inSyllabus === false ? "Topic not found in the syllabus text, flagged for a person." : "Inside the syllabus and not a copy of a past paper.");
}

function finalStatus(subject: string, notes: Notes): { status: ValidationStatus; reason?: string } {
  if (notes.flags?.length) return { status: "needs_review", reason: notes.flags[0] };
  if (alwaysHumanCheck.includes(subject.trim().toLowerCase())) return { status: "needs_review", reason: "Facts in this subject are checked by a person." };
  if (notes.proven) return { status: "auto_passed" };
  if (notes.solver?.agrees) return { status: "auto_passed" };
  return { status: "needs_review", reason: "No independent solver confirmed the answer." };
}

async function dedupeStage(env: Env, row: Row) {
  const existing = await env.db.query<{ stem: string }>(
    "select stem from questions where subject = $1 and id <> $2 and (batch_id is distinct from $3 or id < $2) order by created_at desc limit 5000",
    [row.subject, row.id, env.batch.id]
  );
  const near = findNearDuplicate(row.stem, existing.rows.map((item) => item.stem), 0.8);
  if (near) {
    await finish(env, row, "rejected", { ...row.validation_notes, error: "Duplicate of an existing question." });
    return logEvent(env.db, env.batch.id, row.id, "dedupe", "rejected", `Matches an existing question (${Math.round(near.score * 100)}% similar).`);
  }
  const { status, reason } = finalStatus(row.subject, row.validation_notes);
  await finish(env, row, status, row.validation_notes);
  await logEvent(env.db, env.batch.id, row.id, "dedupe", status === "auto_passed" ? "passed" : "review", status === "auto_passed" ? "Unique. All checks passed." : `Unique. Needs a person: ${reason}`);
}

async function fixStage(env: Env, row: Row) {
  const notes = row.validation_notes;
  const reasons = notes.reasons?.length ? notes.reasons : ["Failed a check."];
  // When only the written solution failed, the question, options and key stay exactly as they are.
  const explanationOnly = reasons.every(isExplanationReason);
  const raw = await env.ai.complete(
    ctx(env, row, "fix"),
    fixPrompt({ exam: env.batch.config.examName, tier: row.tier ?? env.batch.config.tier, question: row.stem, options: row.options, correct_answer: row.correct_option, explanation: row.explanation, subject: row.subject, topic: row.topic, difficulty: row.difficulty, reasons, explanationOnly })
  );
  const reply = parseJsonObject(raw) as Record<string, unknown>;
  const parsed = questionDraftSchema.safeParse(
    explanationOnly
      ? { ...rowDraft(env, row), explanation: reply.explanation }
      : { ...reply, exam: env.batch.config.examName, tier: row.tier ?? env.batch.config.tier, subject: row.subject, topic: row.topic, difficulty: row.difficulty, source_type: "original_ai_generated" }
  );
  if (!parsed.success) {
    await finish(env, row, "needs_review", { ...notes, flags: [...(notes.flags ?? []), "Fixer returned an unusable question."] });
    return logEvent(env.db, env.batch.id, row.id, "fix", "review", "The fixer could not repair this one. A person will look at it.");
  }
  const expression = explanationOnly ? notes.verification_expression ?? null : typeof reply.verification_expression === "string" ? reply.verification_expression : null;
  const next: Notes = { verification_expression: expression, ...(notes.template ? { template: notes.template } : {}), ...(notes.recheck ? { recheck: notes.recheck } : {}), fix_history: [...(notes.fix_history ?? []), reasons[0]], flags: notes.flags };
  const result = await save(env, row, { stage: "solve", notes: next, draft: parsed.data, fixAttempts: row.fix_attempts + 1 });
  if (result === "duplicate") return logEvent(env.db, env.batch.id, row.id, "fix", "rejected", "The repaired question matched an existing one.");
  await logEvent(env.db, env.batch.id, row.id, "fix", "fixed", `${explanationOnly ? "Rewrote the explanation" : "Rewrote the question"}. Reason: ${reasons[0]}`);
}

async function processRow(env: Env, row: Row): Promise<"advanced" | "waiting"> {
  try {
    if (row.pipeline_stage === "solve") await solveStage(env, row);
    else if (row.pipeline_stage === "language") await languageStage(env, row);
    else if (row.pipeline_stage === "syllabus") await syllabusStage(env, row);
    else if (row.pipeline_stage === "dedupe") await dedupeStage(env, row);
    else if (row.pipeline_stage === "fixing") await fixStage(env, row);
    return "advanced";
  } catch (error) {
    if (error instanceof AwaitingAi) {
      await env.db.query("update questions set waiting_ai = true, claimed_at = null where id = $1", [row.id]);
      return "waiting";
    }
    // A broken answer must never stall the run or slip through: park the question for a person.
    const message = error instanceof Error ? error.message : "Unknown error";
    await finish(env, row, "needs_review", { ...row.validation_notes, error: message });
    await logEvent(env.db, env.batch.id, row.id, row.pipeline_stage, "error", `Could not finish this stage: ${message}. A person will look at it.`);
    return "advanced";
  }
}

async function claim(db: Db, batchId: string, stage: string, limit: number) {
  const result = await db.query<Row>(
    `update questions set claimed_at = now() where id in (
       select id from questions where batch_id = $1 and pipeline_stage = $2 and waiting_ai = false
         and (claimed_at is null or claimed_at < now() - interval '2 minutes')
       order by created_at limit $3 for update skip locked)
     returning id, subject, topic, tier, difficulty, stem, options, correct_option, explanation, est_time_seconds, validation_notes, fix_attempts, pipeline_stage`,
    [batchId, stage, limit]
  );
  return result.rows;
}

async function insertCandidate(env: Env, examId: string, candidate: Candidate, generator: string) {
  const { draft } = candidate;
  const notes: Notes = { verification_expression: candidate.verificationExpression ?? null, ...(candidate.template ? { template: candidate.template } : {}) };
  const inserted = await env.db.query<{ id: string }>(
    `insert into questions (exam_id, tier, subject, topic, difficulty, stem, options, correct_option, explanation, est_time_seconds, source_type,
       validation_status, validation_notes, generator_model, critic_model, prompt_version, batch_id, content_hash, pipeline_stage)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'original_ai_generated','pending',$11,$12,$13,$14,$15,$16,'solve')
     on conflict (content_hash) do nothing returning id`,
    [
      examId, draft.tier ?? env.batch.config.tier, env.batch.subject, draft.topic || env.batch.topic || env.batch.subject, draft.difficulty, draft.question,
      JSON.stringify(draft.options), draft.correct_answer, draft.explanation, draft.estimated_time_seconds, JSON.stringify(notes), generator,
      env.ai.mode === "rules" ? "rules" : env.ai.model, PROMPT_VERSION, env.batch.id, contentHash(draft)
    ]
  );
  return inserted.rows[0]?.id ?? null;
}

async function storeWritten(env: Env, examId: string, raw: string) {
  const parsed = parseJsonObject(raw) as { questions?: unknown[] };
  let stored = 0;
  let rejected = 0;
  let duplicates = 0;
  for (const item of parsed.questions ?? []) {
    const draft = questionDraftSchema.safeParse({ source_type: "original_ai_generated", exam: env.batch.config.examName, subject: env.batch.subject, ...(item as object) });
    if (!draft.success) {
      rejected++;
      continue;
    }
    const expression = (item as { verification_expression?: unknown }).verification_expression;
    const id = await insertCandidate(env, examId, { draft: draft.data, verificationExpression: typeof expression === "string" ? expression : null }, env.ai.model);
    if (id) stored++;
    else duplicates++;
  }
  if (stored) await logEvent(env.db, env.batch.id, null, "write", "info", `Wrote ${stored} question${stored === 1 ? "" : "s"}.${duplicates ? ` ${duplicates} repeated an existing question.` : ""}`);
  if (rejected || !stored) await logEvent(env.db, env.batch.id, null, "write", stored ? "info" : "error", stored ? `${rejected} drafts were malformed and dropped.` : "The writer returned nothing usable.");
  return stored;
}

type WriteOutcome = "wrote" | "waiting" | "exhausted" | "idle";

async function writeStage(env: Env): Promise<WriteOutcome> {
  const { db, batch, ai } = env;
  const examId = await ensureExam(db, batch.config.examName);
  const total = async () => (await db.query<{ n: number }>("select count(*)::int as n from questions where batch_id = $1", [batch.id])).rows[0].n;
  let written = await total();
  if (written >= batch.requested_count) return "idle";

  if (batch.config.strategy === "template") {
    const input: FactoryInput = { exam: batch.config.examName, tier: batch.config.tier, subject: batch.subject, topic: batch.topic ?? undefined, difficulty: batch.difficulty as FactoryInput["difficulty"], count: batch.requested_count, strategy: "template" };
    const want = Math.min(batch.requested_count - written, WRITE_CHUNK.rules);
    let stored = 0;
    for (const candidate of templateCandidates({ ...input, count: want })) {
      if (stored >= want) break;
      if (await insertCandidate(env, examId, candidate, `template:${candidate.template?.name ?? "quant"}`)) stored++;
    }
    if (!stored) {
      await logEvent(db, batch.id, null, "write", "error", "No more distinct template questions are available for this topic.");
      return "exhausted";
    }
    await logEvent(db, batch.id, null, "write", "info", `Built ${stored} question${stored === 1 ? "" : "s"} from exact arithmetic templates.`);
    return "wrote";
  }

  const failures = (await db.query<{ n: number }>("select count(*)::int as n from factory_events where batch_id = $1 and stage = 'write' and outcome = 'error'", [batch.id])).rows[0].n;
  if (failures >= 3) return "exhausted";

  const chunk = WRITE_CHUNK[ai.mode === "queue" ? "queue" : "api"];
  const knowledge = await env.knowledge();
  let outcome: WriteOutcome = "idle";

  if (ai.mode === "queue") {
    // Answered write tasks first, in the order they were issued.
    const answered = await db.query<{ id: string; response: string }>("select id, response from factory_tasks where batch_id = $1 and stage = 'write' and status = 'answered' order by created_at", [batch.id]);
    for (const task of answered.rows) {
      try {
        await storeWritten(env, examId, task.response);
      } catch (error) {
        await logEvent(db, batch.id, null, "write", "error", `Could not read an answer: ${error instanceof Error ? error.message : "invalid"}`);
      }
      await db.query("update factory_tasks set status = 'applied' where id = $1", [task.id]);
      outcome = "wrote";
    }
    written = await total();
  }

  const pending = async () => (await db.query<{ n: number }>("select count(*)::int as n from factory_tasks where batch_id = $1 and stage = 'write' and status = 'pending'", [batch.id])).rows[0].n;
  let open = ai.mode === "queue" ? await pending() : 0;
  const parallel = ai.mode === "queue" ? WRITE_PARALLEL_QUEUE : 1;
  let calls = (await db.query<{ write_calls: number }>("select write_calls from question_batches where id = $1", [batch.id])).rows[0].write_calls;

  while (written + open * chunk < batch.requested_count && open < parallel) {
    const request = generationPrompt({
      exam: batch.config.examName, tier: batch.config.tier, subject: batch.subject, topic: batch.topic ?? batch.subject,
      difficulty: batch.difficulty === "mixed" ? "moderate" : batch.difficulty, count: Math.min(chunk, batch.requested_count - written - open * chunk),
      context: { syllabus: knowledge.syllabus, currentAffairs: knowledge.currentAffairs, pyqSamples: knowledge.pyqSamples }
    });
    const key = `write:${calls}`;
    calls++;
    await db.query("update question_batches set write_calls = $2 where id = $1", [batch.id, calls]);
    try {
      const raw = await ai.complete({ batchId: batch.id, questionId: null, stage: "write", key }, request);
      try {
        await storeWritten(env, examId, raw);
      } catch (error) {
        await logEvent(db, batch.id, null, "write", "error", `Could not read the writer's answer: ${error instanceof Error ? error.message : "invalid"}`);
      }
      written = await total();
      outcome = "wrote";
    } catch (error) {
      if (!(error instanceof AwaitingAi)) {
        await logEvent(db, batch.id, null, "write", "error", error instanceof Error ? error.message : "The writer failed.");
        return outcome === "wrote" ? "wrote" : "idle";
      }
      open++;
      if (outcome !== "wrote") outcome = "waiting";
    }
  }
  return outcome;
}

async function loadBatch(db: Db, id: string): Promise<Batch | null> {
  const result = await db.query<Batch>("select id, status, exam_slug, subject, topic, difficulty, requested_count, write_calls, config from question_batches where id = $1", [id]);
  return result.rows[0] ?? null;
}

async function settle(db: Db, batch: Batch, exhausted: boolean) {
  const stats = await db.query<{ written: number; flight: number; waiting: number; pending: number; passed: number; rejected: number }>(
    `select
       (select count(*)::int from questions where batch_id = $1) as written,
       (select count(*)::int from questions where batch_id = $1 and pipeline_stage is not null and pipeline_stage <> 'done' and waiting_ai = false) as flight,
       (select count(*)::int from questions where batch_id = $1 and waiting_ai = true) as waiting,
       (select count(*)::int from factory_tasks where batch_id = $1 and status = 'pending') as pending,
       (select count(*)::int from questions where batch_id = $1 and validation_status in ('auto_passed', 'needs_review')) as passed,
       (select count(*)::int from questions where batch_id = $1 and validation_status in ('auto_failed', 'rejected')) as rejected`,
    [batch.id]
  );
  const s = stats.rows[0];
  const idle = s.flight === 0 && s.waiting === 0 && s.pending === 0;
  if (idle && (s.written >= batch.requested_count || exhausted)) {
    const failed = exhausted && s.written === 0;
    await db.query(
      `update question_batches set status = $2, generated_count = $3, passed_count = $4, rejected_count = $5, finished_at = now(), error_message = $6 where id = $1`,
      [batch.id, failed ? "failed" : "completed", s.written, s.passed, s.rejected, exhausted && s.written < batch.requested_count ? "The writer could not produce the full number requested." : null]
    );
    return;
  }
  const status = s.flight === 0 && (s.waiting > 0 || s.pending > 0) ? "waiting_ai" : "running";
  await db.query("update question_batches set status = $2, generated_count = $3, passed_count = $4, rejected_count = $5 where id = $1 and status in ('running', 'waiting_ai')", [batch.id, status, s.written, s.passed, s.rejected]);
}

// One round of work. Call it repeatedly (the admin page does) until the batch reports completed or waiting for answers.
export async function advanceBatch(db: Db, ai: AiPort, batchId: string, options: { budgetMs?: number; concurrency?: number } = {}) {
  const budget = options.budgetMs ?? 12000;
  const concurrency = options.concurrency ?? 4;
  const batch = await loadBatch(db, batchId);
  if (!batch || ["completed", "failed", "cancelled"].includes(batch.status)) return batch;

  let knowledgePromise: Promise<Knowledge> | null = null;
  const env: Env = {
    db, ai, batch,
    knowledge: () => (knowledgePromise ??= knowledgeFor(db, { exam: batch.config.examName, subject: batch.subject, topic: batch.topic }))
  };

  const started = Date.now();
  let exhausted = false;
  while (Date.now() - started < budget) {
    let progressed = false;
    for (const stage of STAGE_PRIORITY) {
      const rows = await claim(db, batch.id, stage, concurrency);
      if (!rows.length) continue;
      const results = await Promise.all(rows.map((row) => processRow(env, row)));
      progressed = results.includes("advanced");
      if (progressed) break;
    }
    if (progressed) continue;
    const written = await writeStage(env);
    if (written === "exhausted") {
      exhausted = true;
      break;
    }
    if (written !== "wrote") break;
  }
  await settle(db, batch, exhausted);
  return loadBatch(db, batchId);
}

export async function createBatch(db: Db, input: RunInput): Promise<string> {
  if (input.count < 1) throw new Error("Choose at least one question.");
  if (input.mode === "rules" && !isNumericSubject(input.subject)) throw new Error("Runs without AI are available for Quantitative Aptitude only. Pick the chat queue or an API for other subjects.");
  if (input.mode === "api" && !input.provider) throw new Error("Choose which AI provider writes and checks the questions.");
  const config: BatchConfig = { mode: input.mode, strategy: input.mode === "rules" ? "template" : "llm", examName: input.exam, tier: input.tier, provider: input.provider };
  const created = await db.query<{ id: string }>(
    `insert into question_batches (created_by, exam_slug, subject, topic, difficulty, requested_count, config, status)
     values ($1, $2, $3, $4, $5, $6, $7, 'running') returning id`,
    [input.createdBy ?? null, examSlug(input.exam), input.subject, input.topic || null, input.difficulty, input.count, JSON.stringify(config)]
  );
  await logEvent(db, created.rows[0].id, null, "write", "info", `Run started: ${input.count} questions for ${input.subject}${input.topic ? `, ${input.topic}` : ""}.`);
  return created.rows[0].id;
}

export type RecheckInput = {
  exam: string;
  tier: string;
  subject: string;
  topic?: string;
  mode: Exclude<AiMode, "rules">;
  provider?: string;
  limit: number;
  includeApproved: boolean;
  createdBy?: string | null;
};

// Sends questions that already exist back through the factory's checks (arithmetic, solution check, solver, proofreading,
// syllabus, repeats) in a new run. Published questions and questions in a published test are never touched, and neither are
// human-written ones. A question that fails is repaired by the fixer, and an explanation-only failure keeps the question as is.
export async function recheckQuestions(db: Db, input: RecheckInput): Promise<{ id: string; count: number }> {
  if (input.mode === "api" && !input.provider) throw new Error("Choose which AI provider checks the questions.");
  const statuses = input.includeApproved ? ["auto_passed", "needs_review", "approved"] : ["auto_passed", "needs_review"];
  const picked = await db.query<{ id: string; subject: string }>(
    `select q.id, q.subject from questions q join exams e on e.id = q.exam_id
      where e.slug = $1 and lower(q.subject) = lower($2) and ($3 = '' or q.topic ilike $3 || '%')
        and q.validation_status = any($4) and q.source_type in ('original_ai_generated', 'imported')
        and (q.pipeline_stage is null or q.pipeline_stage = 'done')
        and not exists (select 1 from test_questions tq join tests t on t.id = tq.test_id where tq.question_id = q.id and t.status = 'published')
      order by q.created_at limit $5`,
    [examSlug(input.exam), input.subject, (input.topic ?? "").trim(), statuses, input.limit]
  );
  if (!picked.rows.length) throw new Error("No questions match. Only AI-written questions in review (or approved ones, if you ticked that box) that are not in a published test can be re-checked.");

  const config: BatchConfig = { mode: input.mode, strategy: "llm", examName: input.exam, tier: input.tier, provider: input.provider, recheck: true };
  const created = await db.query<{ id: string }>(
    `insert into question_batches (created_by, exam_slug, subject, topic, difficulty, requested_count, config, status)
     values ($1, $2, $3, $4, 'mixed', $5, $6, 'running') returning id`,
    [input.createdBy ?? null, examSlug(input.exam), picked.rows[0].subject, input.topic?.trim() || null, picked.rows.length, JSON.stringify(config)]
  );
  const id = created.rows[0].id;
  // Keep the arithmetic expression (and template) so Quantitative questions can still be proved; everything else is re-earned.
  await db.query(
    `update questions set batch_id = $1, pipeline_stage = 'solve', validation_status = 'pending', fix_attempts = 0, claimed_at = null, waiting_ai = false,
       validation_notes = jsonb_strip_nulls(jsonb_build_object(
         'verification_expression', validation_notes->'verification_expression',
         'template', validation_notes->'template',
         'recheck', jsonb_build_object('previous_status', validation_status, 'previous_batch', batch_id))),
       updated_at = now()
     where id = any($2::uuid[])`,
    [id, picked.rows.map((row) => row.id)]
  );
  await logEvent(db, id, null, "write", "info", `Re-check started: ${picked.rows.length} existing question${picked.rows.length === 1 ? "" : "s"} sent back through the checks.`);
  return { id, count: picked.rows.length };
}

export async function cancelBatch(db: Db, batchId: string) {
  await db.query("update question_batches set status = 'cancelled', finished_at = now() where id = $1 and status in ('running', 'waiting_ai')", [batchId]);
  await logEvent(db, batchId, null, "write", "info", "Run stopped by an admin.");
}

