import { findNearDuplicate } from "./dedupe";
import { PROMPT_VERSION, generationPrompt, solverPrompt } from "./prompts";
import { generateTemplateQuestion, templatesForTopic, type Difficulty } from "./templates";
import { isNumericSubject, runCodeValidation, type ValidationCheck } from "./validator";
import type { LlmProvider } from "./providers/types";
import type { Db } from "@/lib/db";
import { contentHash, optionKeys, questionDraftSchema, type QuestionDraft, type ValidationStatus } from "@/lib/tests/question-schema";

export type FactoryInput = {
  exam: string;
  tier?: string;
  subject: string;
  topic?: string;
  difficulty: Difficulty | "mixed";
  count: number;
  strategy: "template" | "llm";
  createdBy?: string | null;
};

export type FactoryDeps = { db: Db; generator?: LlmProvider; solver?: LlmProvider };

export type FactorySummary = {
  batchId: string;
  requested: number;
  stored: number;
  duplicates: number;
  autoPassed: number;
  autoFailed: number;
  needsReview: number;
  errors: string[];
};

type Candidate = { draft: QuestionDraft; verificationExpression?: string | null; template?: { name: string; seed: number } };

// Subjects where a correct-looking answer still needs a person to check the facts.
const alwaysHumanCheck = ["general awareness", "general knowledge", "current affairs", "computer knowledge", "static gk"];

const LLM_CHUNK = 5;

function parseJsonObject(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The model did not return JSON.");
  }
}

async function ensureExam(db: Db, name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const found = await db.query<{ id: string }>("select id from exams where slug = $1", [slug]);
  if (found.rows[0]) return found.rows[0].id;
  const created = await db.query<{ id: string }>("insert into exams (slug, name) values ($1, $2) returning id", [slug, name]);
  return created.rows[0].id;
}

function* templateCandidates(input: FactoryInput): Generator<Candidate> {
  const templates = templatesForTopic(input.topic);
  if (!templates.length) return;
  const difficulties: Difficulty[] = input.difficulty === "mixed" ? ["easy", "moderate", "hard"] : [input.difficulty];
  let seed = Math.floor(Math.random() * 1_000_000) + 1;
  for (let attempt = 0; attempt < input.count * 40; attempt++) {
    const [name] = templates[attempt % templates.length];
    const difficulty = difficulties[Math.floor(attempt / templates.length) % difficulties.length];
    const built = generateTemplateQuestion(name, difficulty, seed++);
    if (built) yield { draft: built.draft, verificationExpression: built.verificationExpression, template: { name, seed: built.seed } };
  }
}

export async function llmCandidates(input: FactoryInput, generator: LlmProvider, errors: string[], want: number): Promise<Candidate[]> {
  const out: Candidate[] = [];
  let failures = 0;
  while (out.length < want && failures < 3) {
    const request = generationPrompt({ exam: input.exam, tier: input.tier ?? "Tier I", subject: input.subject, topic: input.topic ?? input.subject, difficulty: input.difficulty === "mixed" ? "moderate" : input.difficulty, count: Math.min(LLM_CHUNK, want - out.length) });
    try {
      const parsed = parseJsonObject(await generator.completeJson(request)) as { questions?: unknown[] };
      let accepted = 0;
      for (const item of parsed.questions ?? []) {
        const draft = questionDraftSchema.safeParse({ source_type: "original_ai_generated", ...(item as object) });
        if (!draft.success) {
          errors.push(`Rejected a malformed question: ${draft.error.issues[0]?.message ?? "invalid"}`);
          continue;
        }
        const expression = (item as { verification_expression?: unknown }).verification_expression;
        out.push({ draft: draft.data, verificationExpression: typeof expression === "string" ? expression : null });
        accepted++;
      }
      failures = accepted ? 0 : failures + 1;
    } catch (error) {
      failures++;
      errors.push(error instanceof Error ? error.message : "Generation failed");
    }
  }
  return out;
}

type SolverResult = { model: string; answer: string | null; agrees: boolean; ambiguous: boolean; reasoning?: string };

async function solveBlind(solver: LlmProvider, draft: QuestionDraft): Promise<SolverResult> {
  const reply = parseJsonObject(await solver.completeJson(solverPrompt(draft.question, draft.options))) as { answer?: string; reasoning?: string; ambiguous?: boolean };
  const answer = typeof reply.answer === "string" ? reply.answer.trim().toUpperCase().slice(0, 1) : null;
  const known = optionKeys.includes(answer as never) ? answer : null;
  return { model: solver.model, answer: known, agrees: known === draft.correct_answer, ambiguous: Boolean(reply.ambiguous), reasoning: reply.reasoning };
}

export async function runBatch(input: FactoryInput, deps: FactoryDeps): Promise<FactorySummary> {
  const { db } = deps;
  const errors: string[] = [];
  const summary: FactorySummary = { batchId: "", requested: input.count, stored: 0, duplicates: 0, autoPassed: 0, autoFailed: 0, needsReview: 0, errors };

  if (input.strategy === "llm" && !deps.generator) throw new Error("An AI generator is required for the llm strategy.");
  if (input.strategy === "template" && !isNumericSubject(input.subject)) throw new Error("Template generation is available for Quantitative Aptitude only.");

  const examId = await ensureExam(db, input.exam);
  const batch = await db.query<{ id: string }>(
    `insert into question_batches (created_by, exam_slug, subject, topic, difficulty, requested_count, config, status)
     values ($1, $2, $3, $4, $5, $6, $7, 'running') returning id`,
    [input.createdBy ?? null, input.exam, input.subject, input.topic ?? null, input.difficulty, input.count, JSON.stringify({ strategy: input.strategy, generator: deps.generator?.model ?? null, solver: deps.solver?.model ?? null })]
  );
  summary.batchId = batch.rows[0].id;

  const existing = (await db.query<{ stem: string }>("select stem from questions where subject = $1 order by created_at desc limit 5000", [input.subject])).rows.map((row) => row.stem);
  const seen = new Set<string>();

  const candidates: Iterable<Candidate> = input.strategy === "template" ? templateCandidates(input) : await llmCandidates(input, deps.generator!, errors, input.count);

  try {
    for (const candidate of candidates) {
      if (summary.stored >= input.count) break;
      const { draft } = candidate;
      const hash = contentHash(draft);
      if (seen.has(hash) || findNearDuplicate(draft.question, existing)) {
        summary.duplicates++;
        continue;
      }
      seen.add(hash);

      const { checks, conclusive } = runCodeValidation(draft, candidate.verificationExpression);
      const notes: Record<string, unknown> = { checks, verification_expression: candidate.verificationExpression ?? null };
      if (candidate.template) notes.template = candidate.template;

      let solver: SolverResult | null = null;
      if (deps.solver) {
        try {
          solver = await solveBlind(deps.solver, draft);
          notes.solver = solver;
        } catch (error) {
          errors.push(`Solver failed: ${error instanceof Error ? error.message : "unknown"}`);
        }
      }

      const failedCheck = (checks as ValidationCheck[]).some((check) => !check.passed);
      const humanFactCheck = alwaysHumanCheck.includes(input.subject.trim().toLowerCase());
      const programmaticallyProven = Boolean(candidate.template) && conclusive;
      let status: ValidationStatus;
      if (failedCheck) status = "auto_failed";
      else if (solver && (!solver.agrees || solver.ambiguous)) status = "auto_failed";
      else if (humanFactCheck) status = "needs_review";
      else if (programmaticallyProven) status = "auto_passed";
      else if (isNumericSubject(input.subject)) status = conclusive && solver?.agrees ? "auto_passed" : "needs_review";
      else status = solver?.agrees ? "auto_passed" : "needs_review";

      const inserted = await db.query<{ id: string }>(
        `insert into questions (exam_id, tier, subject, topic, difficulty, stem, options, correct_option, explanation, est_time_seconds, source_type,
           validation_status, validation_notes, generator_model, critic_model, prompt_version, batch_id, content_hash)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'original_ai_generated',$11,$12,$13,$14,$15,$16,$17)
         on conflict (content_hash) do nothing returning id`,
        [
          examId, draft.tier ?? input.tier ?? null, draft.subject || input.subject, draft.topic || input.topic || input.subject, draft.difficulty, draft.question,
          JSON.stringify(draft.options), draft.correct_answer, draft.explanation, draft.estimated_time_seconds, status, JSON.stringify(notes),
          candidate.template ? `template:${candidate.template.name}` : deps.generator?.model ?? null, solver?.model ?? null, PROMPT_VERSION, summary.batchId, hash
        ]
      );
      if (!inserted.rows[0]) {
        summary.duplicates++;
        continue;
      }
      existing.push(draft.question);
      summary.stored++;
      if (status === "auto_passed") summary.autoPassed++;
      else if (status === "auto_failed") summary.autoFailed++;
      else summary.needsReview++;
    }
    await db.query(
      "update question_batches set status = $2, generated_count = $3, passed_count = $4, rejected_count = $5, error_message = $6, finished_at = now() where id = $1",
      [summary.batchId, summary.stored === 0 && errors.length ? "failed" : "completed", summary.stored, summary.autoPassed + summary.needsReview, summary.autoFailed, errors[0] ?? null]
    );
  } catch (error) {
    await db.query("update question_batches set status = 'failed', error_message = $2, finished_at = now() where id = $1", [summary.batchId, error instanceof Error ? error.message : "failed"]);
    throw error;
  }
  return summary;
}
