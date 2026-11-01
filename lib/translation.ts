import { chartSpecSchema, type ChartSpec } from "@/lib/chart";
import { parseFigure, type FigureSpec } from "@/lib/figure";
import { parseRichBlocks, richTextProblem } from "@/lib/rich-text";
import { optionKeys } from "@/lib/tests/question-schema";

// Hindi versions of questions. Pure checks only, so the same rules run when an AI writes a translation and when a person edits one.
// The English text stays the source of truth: a translation may change the words, never the numbers, the structure or the key.

export type Lang = "hi";

// Labels of the written solution, in English and Hindi. The solution view recognises both.
export const SOLUTION_LABELS_HI = ["मुख्य विचार", "चरण", "उत्तर", "अन्य विकल्प क्यों नहीं", "शॉर्टकट", "याद रखें"] as const;

export type QuestionText = { stem: string; options: Record<string, string>; explanation: string };

const DEVANAGARI = /[ऀ-ॿ]/;
const DEVANAGARI_DIGITS = /[०-९]/;

// Every number in a text, ignoring thousands commas, as sorted strings, so two texts can be compared whatever order the words come in.
function numbersIn(text: string): string[] {
  return (text.replace(/(\d),(?=\d{3}\b)/g, "$1").match(/\d+(?:\.\d+)?/g) ?? []).map((value) => String(Number(value))).sort();
}

const sameNumbers = (a: string, b: string) => {
  const left = numbersIn(a);
  const right = numbersIn(b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

const hasLetters = (text: string) => /[A-Za-zऀ-ॿ]/.test(text.replace(/\b(?:km|cm|mm|kg|m|g|l|ml|s|hr|h|min|rs)\b/gi, ""));

function tableShape(text: string): string {
  return parseRichBlocks(text)
    .filter((block) => block.type === "table")
    .map((block) => (block.type === "table" ? `${block.header.length}x${block.rows.length}` : ""))
    .join(",");
}

function answerLetter(explanation: string): string | null {
  const line = explanation.split(/\r?\n/).map((item) => item.trim()).find((item) => /^(?:answer\b|उत्तर)/i.test(item));
  return line ? (/\(([A-D])\)/.exec(line)?.[1] ?? null) : null;
}

// Why a translation cannot be used, or null when it passes the code checks. The English question is the source.
export function translationProblem(english: QuestionText & { correct: string }, hindi: QuestionText): string | null {
  const all = [hindi.stem, hindi.explanation, ...optionKeys.map((key) => hindi.options[key] ?? "")].join("\n");
  if (DEVANAGARI_DIGITS.test(all)) return "Use the digits 0-9 as in the English text, not Devanagari digits.";
  if (!hindi.stem.trim() || !DEVANAGARI.test(hindi.stem)) return "The question is not written in Hindi (Devanagari).";
  if (!hindi.explanation.trim() || !DEVANAGARI.test(hindi.explanation)) return "The solution is not written in Hindi (Devanagari).";
  const bad = richTextProblem(hindi.stem) ?? richTextProblem(hindi.explanation) ?? optionKeys.map((key) => richTextProblem(hindi.options[key] ?? "", { singleLine: true })).find(Boolean);
  if (bad) return `The Hindi text has a formatting problem. ${bad}`;

  if (!sameNumbers(english.stem, hindi.stem)) return "The numbers in the Hindi question differ from the English question. Every number must be kept exactly.";
  if (tableShape(english.stem) !== tableShape(hindi.stem)) return "The table in the Hindi question does not have the same rows and columns as the English one.";
  for (const key of optionKeys) {
    const en = english.options[key] ?? "";
    const hi = (hindi.options[key] ?? "").trim();
    if (!hi) return `Option ${key} is empty in the Hindi version.`;
    if (!sameNumbers(en, hi)) return `The numbers in option ${key} differ from the English option.`;
    // An option that is only a number or symbols must stay as it is, except for a unit.
    if (!hasLetters(en) && hasLetters(hi) && !DEVANAGARI.test(hi)) return `Option ${key} should stay as it is in English.`;
  }
  if (!sameNumbers(english.explanation, hindi.explanation)) return "The numbers in the Hindi solution differ from the English solution.";
  const englishLines = english.explanation.split(/\r?\n/).filter((line) => line.trim()).length;
  const hindiLines = hindi.explanation.split(/\r?\n/).filter((line) => line.trim()).length;
  if (englishLines !== hindiLines) return `The Hindi solution has ${hindiLines} lines but the English one has ${englishLines}. Keep one line for each line.`;
  const letter = answerLetter(hindi.explanation);
  if (letter !== english.correct) return `The Hindi solution's उत्तर line must name option (${english.correct}) as in English.`;
  return null;
}

// A figure's translation keeps its shape and numbers; only names and labels change.
export function figureTranslationProblem(english: FigureSpec, hindi: unknown): { figure: FigureSpec } | { error: string } {
  const parsed = parseFigure(hindi);
  if ("error" in parsed) return { error: `The translated figure is not valid. ${parsed.error}` };
  const figure = parsed.figure;
  if (figure.type !== english.type) return { error: "The translated figure is a different kind of figure." };
  if (figure.type === "venn" && english.type === "venn") {
    if (JSON.stringify(figure.counts) !== JSON.stringify(english.counts) || figure.sets.length !== english.sets.length) return { error: "The translated Venn diagram must keep every count and set." };
  }
  if (figure.type === "geometry" && english.type === "geometry") {
    if (JSON.stringify(figure.points) !== JSON.stringify(english.points)) return { error: "The translated figure must keep every point name and position exactly." };
    const shape = (item: GeometryLike) => JSON.stringify([item.lines.map((line) => [line.from, line.to, numbersIn(line.label ?? "")]), item.circles.map((circle) => [circle.center, circle.radius, numbersIn(circle.label ?? "")]), item.angles.map((angle) => [angle.at, angle.from, angle.to, numbersIn(angle.label)])]);
    if (shape(figure) !== shape(english)) return { error: "The translated figure must keep the same lines, circles, angles and numbers; only the label words may change." };
  }
  return { figure };
}
type GeometryLike = Extract<FigureSpec, { type: "geometry" }>;

// A set's data or passage translation. A table or chart keeps its numbers; a passage is just text.
export function setTranslationProblem(
  english: { title: string; stimulus: string; chart: ChartSpec | null },
  hindi: { title: string; stimulus: string; chart: unknown }
): { chart: ChartSpec | null } | { error: string } {
  if (!hindi.title.trim() || !DEVANAGARI.test(hindi.title)) return { error: "The title is not written in Hindi (Devanagari)." };
  if (DEVANAGARI_DIGITS.test(`${hindi.stimulus}\n${JSON.stringify(hindi.chart ?? "")}`)) return { error: "Use the digits 0-9 as in the English text." };
  if (english.stimulus.trim() && (!hindi.stimulus.trim() || !DEVANAGARI.test(hindi.stimulus))) return { error: "The text is not written in Hindi (Devanagari)." };
  const bad = richTextProblem(hindi.stimulus);
  if (bad) return { error: `The Hindi text has a formatting problem. ${bad}` };
  if (!sameNumbers(english.stimulus, hindi.stimulus)) return { error: "The numbers in the Hindi text differ from the English text." };
  if (tableShape(english.stimulus) !== tableShape(hindi.stimulus)) return { error: "The table does not have the same rows and columns as the English one." };

  if (!english.chart) return hindi.chart ? { error: "The English set has no chart, so the translation must not have one." } : { chart: null };
  const parsed = chartSpecSchema.safeParse(hindi.chart);
  if (!parsed.success) return { error: `The translated chart is not valid. ${parsed.error.issues.map((issue) => issue.message).join(" ")}` };
  const chart = parsed.data;
  const same =
    chart.type === english.chart.type &&
    chart.categories.length === english.chart.categories.length &&
    chart.series.length === english.chart.series.length &&
    chart.series.every((series, index) => series.as === english.chart!.series[index].as && JSON.stringify(series.values) === JSON.stringify(english.chart!.series[index].values));
  if (!same) return { error: "The translated chart must keep the same type, series and every value. Only the words may change." };
  if (!DEVANAGARI.test(chart.title)) return { error: "The chart title is not written in Hindi (Devanagari)." };
  return { chart };
}
