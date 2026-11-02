import type { FigureSpec } from "@/lib/figure";
import type { QuestionSet } from "@/lib/question-sets";

// What a learner sees in each language. Only an approved Hindi version is ever loaded, so a question without one is shown in English.

export type Lang = "en" | "hi";

export type HindiVersion = {
  stem: string;
  options: Record<string, string>;
  // Only present once the learner is allowed to see solutions.
  explanation?: string | null;
  figure: FigureSpec | null;
  // The shared data or passage, translated. Null when the question is not part of a set.
  set: QuestionSet | null;
};

type Localizable = { stem: string; options: Record<string, string>; figure?: FigureSpec | null; set?: QuestionSet | null; hi?: HindiVersion | null };

export const toLang = (value: string | null | undefined): Lang => (value === "hi" ? "hi" : "en");

export function localize<T extends Localizable>(question: T, lang: Lang): { stem: string; options: Record<string, string>; figure: FigureSpec | null; set: QuestionSet | null; translated: boolean } {
  if (lang === "hi" && question.hi) {
    return { stem: question.hi.stem, options: question.hi.options, figure: question.hi.figure ?? question.figure ?? null, set: question.hi.set ?? question.set ?? null, translated: true };
  }
  return { stem: question.stem, options: question.options, figure: question.figure ?? null, set: question.set ?? null, translated: false };
}

// The written solution, in the chosen language when there is one.
export const solutionFor = (question: { explanation: string; hi?: HindiVersion | null }, lang: Lang) => (lang === "hi" && question.hi?.explanation ? question.hi.explanation : question.explanation);
