import type { Db } from "@/lib/db";
import { toFigure, figureToText, type FigureSpec } from "@/lib/figure";
import { setContextText, toQuestionSet } from "@/lib/question-sets";
import { figureTranslationProblem, setTranslationProblem, translationProblem, type Lang } from "@/lib/translation";
import { optionKeys } from "@/lib/tests/question-schema";
import { AwaitingAi, logEvent, type AiPort } from "./engine";
import { examSlug } from "./knowledge";
import { parseJsonObject } from "./pipeline";
import { setTranslationPrompt, translationPrompt } from "./translate-prompts";
import { solverPrompt } from "./prompts";

// Translates published and approved questions into Hindi, one run at a time. A question's shared data (table, chart, passage) is
// translated first. Every translation passes code checks (numbers, tables, the solution's answer line), then a second AI solves
// the Hindi question blind and must reach the English key. A person who reads Hindi approves the result before learners see it.

export const MAX_TRANSLATION_ATTEMPTS = 2;
const QUEUE_BATCH = 40;
const API_BATCH = 4;

export type TranslateInput = {
  exam: string;
  tier: string;
  subject: string;
  topic?: string;
  lang?: Lang;
  mode: "queue" | "api";
  provider?: string;
  limit: number;
  createdBy?: string | null;
};

export async function startTranslation(db: Db, input: TranslateInput): Promise<{ id: string; count: number }> {
  const lang = input.lang ?? "hi";
  if (input.mode === "api" && !input.provider) throw new Error("Choose which AI provider writes the translations.");
  // The English Language section of SSC papers is in English only, so it is never translated.
  const picked = await db.query<{ id: string; set_id: string | null; subject: string }>(
    `select q.id, q.set_id, q.subject from questions q join exams e on e.id = q.exam_id
      where e.slug = $1 and lower(q.subject) = lower($2) and ($3 = '' or q.topic ilike $3 || '%')
        and q.validation_status in ('published', 'approved') and lower(q.subject) not like 'english%'
        and not exists (select 1 from question_translations t where t.question_id = q.id and t.lang = $4 and t.status in ('pending', 'checking', 'needs_review', 'approved'))
      order by q.created_at limit $5`,
    [examSlug(input.exam), input.subject, (input.topic ?? "").trim(), lang, input.limit]
  );
  if (!picked.rows.length) {
    throw new Error(/^english/i.test(input.subject.trim()) ? "English Language questions stay in English, so they are not translated." : "No questions to translate. Only published or approved questions that have no Hindi version yet are picked.");
  }

  const config = { mode: input.mode, strategy: "llm", examName: input.exam, tier: input.tier, provider: input.provider, translate: lang };
  const created = await db.query<{ id: string }>(
    `insert into question_batches (created_by, exam_slug, subject, topic, difficulty, requested_count, config, status)
     values ($1, $2, $3, $4, 'mixed', $5, $6, 'running') returning id`,
    [input.createdBy ?? null, examSlug(input.exam), picked.rows[0].subject, input.topic?.trim() || null, picked.rows.length, JSON.stringify(config)]
  );
  const id = created.rows[0].id;
  for (const row of picked.rows) {
    await db.query(
      `insert into question_translations (question_id, lang, status, batch_id) values ($1, $2, 'pending', $3)
       on conflict (question_id, lang) do update set status = 'pending', attempts = 0, notes = '{}'::jsonb, batch_id = excluded.batch_id, updated_at = now()`,
      [row.id, lang, id]
    );
  }
  for (const setId of new Set(picked.rows.map((row) => row.set_id).filter((value): value is string => Boolean(value)))) {
    await db.query(
      `insert into set_translations (set_id, lang, status, batch_id) values ($1, $2, 'pending', $3)
       on conflict (set_id, lang) do update set status = 'pending', attempts = 0, notes = '{}'::jsonb, batch_id = excluded.batch_id, updated_at = now()
       where set_translations.status in ('rejected', 'failed')`,
      [setId, lang, id]
    );
  }
  await logEvent(db, id, null, "translate", "info", `Translation started: ${picked.rows.length} question${picked.rows.length === 1 ? "" : "s"} into Hindi.`);
  return { id, count: picked.rows.length };
}

type Outcome = "advanced" | "waiting";

type QuestionJob = {
  id: string;
  question_id: string;
  status: "pending" | "checking";
  attempts: number;
  notes: { reasons?: string[] };
  stem: string;
  options: Record<string, string>;
  explanation: string;
  figure: unknown;
  en_stem: string;
  en_options: Record<string, string>;
  en_explanation: string;
  en_figure: unknown;
  correct_option: string;
  set_id: string | null;
};

const ctx = (batchId: string, questionId: string | null, stage: string, key: string) => ({ batchId, questionId, stage, key });

async function englishSet(db: Db, setId: string) {
  const found = await db.query<{ id: string; title: string; stimulus: string; chart: unknown; kind: string }>("select id, title, stimulus, chart, kind from question_sets where id = $1", [setId]);
  return found.rows[0] ? toQuestionSet(found.rows[0]) : null;
}

// What happens to a translation that failed a check: another try with the reasons, or failure once the tries are used up.
async function reject(db: Db, table: "question_translations" | "set_translations", id: string, batchId: string, questionId: string | null, attempts: number, reason: string) {
  const exhausted = attempts + 1 >= MAX_TRANSLATION_ATTEMPTS;
  await db.query(`update ${table} set status = $2, attempts = attempts + 1, notes = $3, updated_at = now() where id = $1`, [id, exhausted ? "failed" : "pending", JSON.stringify({ reasons: [reason] })]);
  await logEvent(db, batchId, questionId, "translate", "rejected", exhausted ? `Could not be translated: ${reason}` : `${reason} Sent back to the translator.`);
}

async function translateSet(db: Db, ai: AiPort, batchId: string, job: { id: string; set_id: string; attempts: number; notes: { reasons?: string[] } }): Promise<Outcome> {
  const english = await englishSet(db, job.set_id);
  if (!english) {
    await db.query("update set_translations set status = 'failed', updated_at = now() where id = $1", [job.id]);
    return "advanced";
  }
  const request = setTranslationPrompt({ title: english.title, stimulus: english.stimulus, chart: english.chart, reasons: job.notes.reasons });
  let raw: string;
  try {
    raw = await ai.complete(ctx(batchId, null, "translate", `translate-set:${job.id}:${job.attempts}`), request);
  } catch (error) {
    if (error instanceof AwaitingAi) return "waiting";
    throw error;
  }
  let reply: { title?: unknown; text?: unknown; chart?: unknown } = {};
  try {
    reply = parseJsonObject(raw) as typeof reply;
  } catch {
    await reject(db, "set_translations", job.id, batchId, null, job.attempts, "The reply was not valid JSON.");
    return "advanced";
  }
  const hindi = { title: typeof reply.title === "string" ? reply.title.trim() : "", stimulus: typeof reply.text === "string" ? reply.text.trim() : "", chart: english.chart ? reply.chart : null };
  const checked = setTranslationProblem({ title: english.title, stimulus: english.stimulus, chart: english.chart }, hindi);
  if ("error" in checked) {
    await reject(db, "set_translations", job.id, batchId, null, job.attempts, checked.error);
    return "advanced";
  }
  await db.query("update set_translations set title = $2, stimulus = $3, chart = $4, status = 'needs_review', model = $5, notes = '{}'::jsonb, updated_at = now() where id = $1", [job.id, hindi.title, hindi.stimulus, checked.chart ? JSON.stringify(checked.chart) : null, ai.model]);
  await logEvent(db, batchId, null, "translate", "passed", `Translated the shared ${english.kind === "data" ? "data" : "passage"} "${english.title}".`);
  return "advanced";
}

// The shared data as the Hindi solver should read it: the Hindi version when it exists, otherwise the English.
async function dataForHindi(db: Db, setId: string | null, figure: FigureSpec | null): Promise<{ text: string | undefined; ready: boolean; failed: boolean }> {
  const parts: string[] = [];
  if (setId) {
    const hindi = (await db.query<{ title: string; stimulus: string; chart: unknown; status: string; kind: string }>(
      "select st.title, st.stimulus, st.chart, st.status, s.kind from set_translations st join question_sets s on s.id = st.set_id where st.set_id = $1 and st.lang = 'hi'", [setId])).rows[0];
    if (hindi?.status === "failed" || hindi?.status === "rejected") return { text: undefined, ready: false, failed: true };
    if (!hindi || hindi.status === "pending" || hindi.status === "checking") return { text: undefined, ready: false, failed: false };
    parts.push(setContextText(toQuestionSet({ id: setId, title: hindi.title, stimulus: hindi.stimulus, chart: hindi.chart, kind: hindi.kind })));
  }
  if (figure) parts.push(figureToText(figure));
  return { text: parts.length ? parts.join("\n\n") : undefined, ready: true, failed: false };
}

async function translateQuestion(db: Db, ai: AiPort, batchId: string, job: QuestionJob): Promise<Outcome> {
  const englishFigure = toFigure(job.en_figure);
  if (job.status === "pending") {
    const set = job.set_id ? await englishSet(db, job.set_id) : null;
    const request = translationPrompt({
      question: job.en_stem, options: job.en_options, explanation: job.en_explanation, correct: job.correct_option,
      figure: englishFigure ?? undefined, data: set ? setContextText(set) : undefined, reasons: job.notes.reasons
    });
    let raw: string;
    try {
      raw = await ai.complete(ctx(batchId, job.question_id, "translate", `translate:${job.id}:${job.attempts}`), request);
    } catch (error) {
      if (error instanceof AwaitingAi) return "waiting";
      throw error;
    }
    let reply: { question?: unknown; options?: Record<string, unknown>; explanation?: unknown; figure?: unknown } = {};
    try {
      reply = parseJsonObject(raw) as typeof reply;
    } catch {
      await reject(db, "question_translations", job.id, batchId, job.question_id, job.attempts, "The reply was not valid JSON.");
      return "advanced";
    }
    const hindi = {
      stem: typeof reply.question === "string" ? reply.question.trim() : "",
      options: Object.fromEntries(optionKeys.map((key) => [key, typeof reply.options?.[key] === "string" ? (reply.options[key] as string).trim() : ""])),
      explanation: typeof reply.explanation === "string" ? reply.explanation.trim() : ""
    };
    let problem = translationProblem({ stem: job.en_stem, options: job.en_options, explanation: job.en_explanation, correct: job.correct_option }, hindi);
    let figure: FigureSpec | null = null;
    if (!problem && englishFigure) {
      const checked = figureTranslationProblem(englishFigure, reply.figure);
      if ("error" in checked) problem = checked.error;
      else figure = checked.figure;
    }
    if (problem) {
      await reject(db, "question_translations", job.id, batchId, job.question_id, job.attempts, problem);
      return "advanced";
    }
    await db.query(
      "update question_translations set stem = $2, options = $3, explanation = $4, figure = $5, status = 'checking', model = $6, notes = '{}'::jsonb, updated_at = now() where id = $1",
      [job.id, hindi.stem, JSON.stringify(hindi.options), hindi.explanation, figure ? JSON.stringify(figure) : null, ai.model]
    );
    await logEvent(db, batchId, job.question_id, "translate", "passed", "Translated. Checking that the meaning is unchanged.");
    return "advanced";
  }

  // Meaning check: a second AI solves the Hindi question without the key and must reach the English key.
  const data = await dataForHindi(db, job.set_id, toFigure(job.figure));
  if (data.failed) {
    await db.query("update question_translations set status = 'failed', notes = $2, updated_at = now() where id = $1", [job.id, JSON.stringify({ reasons: ["The data this question shares could not be translated."] })]);
    await logEvent(db, batchId, job.question_id, "verify", "rejected", "The data this question shares could not be translated.");
    return "advanced";
  }
  if (!data.ready) return "waiting";
  let raw: string;
  try {
    raw = await ai.complete(ctx(batchId, job.question_id, "verify", `verify:${job.id}:${job.attempts}`), solverPrompt(job.stem, job.options, data.text));
  } catch (error) {
    if (error instanceof AwaitingAi) return "waiting";
    throw error;
  }
  const answer = parseJsonObject(raw) as { answer?: unknown; ambiguous?: unknown };
  const chosen = typeof answer.answer === "string" ? answer.answer.trim().toUpperCase().slice(0, 1) : "";
  if (chosen !== job.correct_option || Boolean(answer.ambiguous)) {
    await reject(db, "question_translations", job.id, batchId, job.question_id, job.attempts, chosen !== job.correct_option ? `A solver reading only the Hindi chose ${chosen || "no option"} but the key is ${job.correct_option}, so the meaning may have changed.` : "A solver reading only the Hindi found more than one defensible answer.");
    return "advanced";
  }
  await db.query("update question_translations set status = 'needs_review', updated_at = now() where id = $1", [job.id]);
  await logEvent(db, batchId, job.question_id, "verify", "passed", "A solver reading only the Hindi reached the same answer. Waiting for a person to approve.");
  return "advanced";
}

async function settle(db: Db, batchId: string, progressed: boolean) {
  const stats = (await db.query<{ total: number; open: number; ready: number; failed: number; tasks: number }>(
    `select (select count(*)::int from question_translations where batch_id = $1) as total,
            (select count(*)::int from question_translations where batch_id = $1 and status in ('pending', 'checking'))
              + (select count(*)::int from set_translations where batch_id = $1 and status in ('pending', 'checking')) as open,
            (select count(*)::int from question_translations where batch_id = $1 and status in ('needs_review', 'approved')) as ready,
            (select count(*)::int from question_translations where batch_id = $1 and status in ('failed', 'rejected')) as failed,
            (select count(*)::int from factory_tasks where batch_id = $1 and status = 'pending') as tasks`,
    [batchId]
  )).rows[0];
  if (stats.open === 0 && stats.tasks === 0) {
    await db.query("update question_batches set status = 'completed', generated_count = $2, passed_count = $3, rejected_count = $4, finished_at = now() where id = $1", [batchId, stats.total, stats.ready, stats.failed]);
    return;
  }
  const status = !progressed && stats.tasks > 0 ? "waiting_ai" : "running";
  await db.query("update question_batches set status = $2, generated_count = $3, passed_count = $4, rejected_count = $5 where id = $1 and status in ('running', 'waiting_ai')", [batchId, status, stats.total, stats.ready, stats.failed]);
}

export async function advanceTranslation(db: Db, ai: AiPort, batchId: string, options: { budgetMs?: number } = {}) {
  const batchRow = (await db.query<{ status: string }>("select status from question_batches where id = $1", [batchId])).rows[0];
  if (!batchRow || ["completed", "failed", "cancelled"].includes(batchRow.status)) return batchRow ?? null;
  const size = ai.mode === "queue" ? QUEUE_BATCH : API_BATCH;
  const started = Date.now();
  let everProgressed = false;

  while (Date.now() - started < (options.budgetMs ?? 12000)) {
    let progressed = false;
    try {
      const sets = (await db.query<{ id: string; set_id: string; attempts: number; notes: { reasons?: string[] } }>(
        "select id, set_id, attempts, notes from set_translations where batch_id = $1 and status = 'pending' order by created_at limit $2", [batchId, size])).rows;
      progressed = (await Promise.all(sets.map((job) => translateSet(db, ai, batchId, job)))).includes("advanced");

      if (!progressed) {
        const jobs = (await db.query<QuestionJob>(
          `select t.id, t.question_id, t.status, t.attempts, t.notes, t.stem, t.options, t.explanation, t.figure,
                  q.stem as en_stem, q.options as en_options, q.explanation as en_explanation, q.figure as en_figure, q.correct_option, q.set_id
             from question_translations t join questions q on q.id = t.question_id
            where t.batch_id = $1 and t.status in ('pending', 'checking') order by case t.status when 'checking' then 0 else 1 end, t.created_at limit $2`,
          [batchId, size]
        )).rows;
        progressed = (await Promise.all(jobs.map((job) => translateQuestion(db, ai, batchId, job)))).includes("advanced");
      }
    } catch (error) {
      // A broken answer must never stall the run: report it and stop this round.
      await logEvent(db, batchId, null, "translate", "error", error instanceof Error ? error.message : "The translator failed.");
      break;
    }
    everProgressed ||= progressed;
    if (!progressed) break;
  }
  await settle(db, batchId, everProgressed);
  return (await db.query<{ status: string }>("select status from question_batches where id = $1", [batchId])).rows[0] ?? null;
}
