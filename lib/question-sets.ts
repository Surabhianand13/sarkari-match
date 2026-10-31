import { chartNumbers, chartToText, parseChart, type ChartSpec } from "@/lib/chart";
import { parseRichBlocks, richTextProblem } from "@/lib/rich-text";

// A data set: one table or chart shown with several questions.
export type QuestionSet = { id: string; title: string; stimulus: string; chart: ChartSpec | null };

export type SetRow = { id: string; title: string; stimulus: string; chart: unknown };

export function toQuestionSet(row: SetRow): QuestionSet {
  const parsed = row.chart ? parseChart(row.chart) : null;
  return { id: row.id, title: row.title, stimulus: row.stimulus, chart: parsed && "chart" in parsed ? parsed.chart : null };
}

export const hasTable = (text: string) => parseRichBlocks(text).some((block) => block.type === "table");

// The set's data as plain text, for the solver, reviewer and fixer, which cannot see a drawing.
export function setContextText(set: Pick<QuestionSet, "title" | "stimulus" | "chart">): string {
  return [`Data set: ${set.title}`, set.stimulus.trim(), set.chart ? chartToText(set.chart) : ""].filter(Boolean).join("\n");
}

// Every number a learner can read from the set's data.
export function setNumbers(set: Pick<QuestionSet, "stimulus" | "chart">): number[] {
  const fromText = (set.stimulus.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return [...fromText, ...(set.chart ? chartNumbers(set.chart) : [])];
}

// Why a set's data cannot be used, or null when it is fine. A set needs a table or a chart so the questions have something to read.
export function setProblem(input: { stimulus: string; chart: unknown }): string | null {
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
  return used.some(known) ? null : "The working does not use any number from the data above. Build the calculation from the values shown in the table or chart.";
}
