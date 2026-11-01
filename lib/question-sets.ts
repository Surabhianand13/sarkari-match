import { chartNumbers, chartToText, parseChart, type ChartSpec } from "@/lib/chart";
import { parseRichBlocks, richTextProblem } from "@/lib/rich-text";

// A set of questions that share one thing to read: a table or chart (data), a passage, or a passage with numbered blanks (cloze).
export type SetContentKind = "data" | "passage" | "cloze";
export type QuestionSet = { id: string; kind: SetContentKind; title: string; stimulus: string; chart: ChartSpec | null };

export type SetRow = { id: string; title: string; stimulus: string; chart: unknown; kind?: string | null };

export function toQuestionSet(row: SetRow): QuestionSet {
  const parsed = row.chart ? parseChart(row.chart) : null;
  const kind: SetContentKind = row.kind === "passage" || row.kind === "cloze" ? row.kind : "data";
  return { id: row.id, kind, title: row.title, stimulus: row.stimulus, chart: parsed && "chart" in parsed ? parsed.chart : null };
}

export const setLabels: Record<SetContentKind, { label: string; context: string; noun: string }> = {
  data: { label: "Data for this question", context: "Data set", noun: "data" },
  passage: { label: "Read the passage", context: "Passage", noun: "passage" },
  cloze: { label: "Read the passage and fill in the blanks", context: "Cloze passage", noun: "passage" }
};

export const hasTable = (text: string) => parseRichBlocks(text).some((block) => block.type === "table");

// The set's data as plain text, for the solver, reviewer and fixer, which cannot see a drawing.
export function setContextText(set: Pick<QuestionSet, "title" | "stimulus" | "chart"> & { kind?: SetContentKind }): string {
  return [`${setLabels[set.kind ?? "data"].context}: ${set.title}`, set.stimulus.trim(), set.chart ? chartToText(set.chart) : ""].filter(Boolean).join("\n");
}

// Every number a learner can read from the set's data.
export function setNumbers(set: Pick<QuestionSet, "stimulus" | "chart">): number[] {
  const fromText = (set.stimulus.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return [...fromText, ...(set.chart ? chartNumbers(set.chart) : [])];
}

export const PASSAGE_MIN_CHARS = 500;
export const PASSAGE_MAX_CHARS = 4000;

// A passage must be long enough to ask five questions about, and a cloze passage must carry its numbered blanks.
export function passageProblem(kind: "passage" | "cloze", stimulus: string): string | null {
  const text = stimulus.trim();
  if (text.length < PASSAGE_MIN_CHARS) return `The passage is too short (${text.length} characters). Write at least ${PASSAGE_MIN_CHARS}.`;
  if (text.length > PASSAGE_MAX_CHARS) return `The passage is too long (${text.length} characters). Keep it under ${PASSAGE_MAX_CHARS}.`;
  if (kind === "cloze") {
    const blanks = new Set([...text.matchAll(/\((\d{1,2})\)\s*(?:_{2,}|\.{3,}|…)/g)].map((match) => match[1]));
    if (blanks.size < 4) return "A cloze passage needs numbered blanks such as (1) ______ for each question.";
  }
  return richTextProblem(text);
}

// Why a set's content cannot be used, or null when it is fine. A data set needs a table or a chart so the questions have something to read.
export function setProblem(input: { stimulus: string; chart: unknown; kind?: SetContentKind }): string | null {
  if (input.kind === "passage" || input.kind === "cloze") return input.chart ? "A passage set cannot also carry a chart." : passageProblem(input.kind, input.stimulus);
  const chart = input.chart ? parseChart(input.chart) : null;
  if (chart && "error" in chart) return `The chart is not valid. ${chart.error}`;
  if (!chart && !hasTable(input.stimulus)) return "A data set needs a chart or a table.";
  return richTextProblem(input.stimulus);
}

const COMMON = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 24, 52, 60, 100, 360, 365, 1000]);

// A question's working must come from the data. Fails only when none of its numbers appear in the data, which means the
// writer ignored the table or chart.
export function groundingProblem(expression: string | null | undefined, data: number[]): string | null {
  if (!expression) return null;
  const used = (expression.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((value) => !COMMON.has(value));
  if (!used.length) return null;
  const known = (value: number) => data.some((item) => Math.abs(item - value) < 0.011);
  return used.some(known) ? null : "The working does not use any number from the data above. Build the calculation from the values shown in the table, chart or figure.";
}
