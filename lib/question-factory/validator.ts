import { evaluateExpression, firstNumber } from "./expression";
import { optionKeys, type QuestionDraft } from "@/lib/tests/question-schema";

export type ValidationCheck = { name: string; passed: boolean; detail?: string };

// Numeric subjects must show their working as an expression that reproduces the keyed option.
const numericSubjects = ["quantitative aptitude", "quant"];

export function isNumericSubject(subject: string) {
  return numericSubjects.includes(subject.trim().toLowerCase());
}

export const MIN_EXPLANATION_CHARS = 100;
export const MIN_EXPLANATION_LINES = 3;

const numbersIn = (text: string) => (text.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

// A solution must read as a worked answer (several lines, an Answer line, enough text to teach something) and must agree
// with the key: the Answer line names the keyed option and its value, and no wrong-option line praises the keyed one.
export function explanationProblem(explanation: string, key?: { correct: string; options: Record<string, string> }): string | null {
  const lines = explanation.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < MIN_EXPLANATION_LINES) return `The explanation is too short or in one line. Write it as separate lines: Key idea, Step 1, Step 2, Answer, Why not the others.`;
  if (explanation.trim().length < MIN_EXPLANATION_CHARS) return "The explanation is too thin to teach from. Show the working in full.";
  const answerLine = lines.find((line) => /^answer\b/i.test(line));
  if (!answerLine) return 'The explanation has no "Answer:" line stating the correct option and its value.';
  if (!key) return null;

  const letter = /^answer\s*:?\s*\(?([A-D])\b/i.exec(answerLine)?.[1]?.toUpperCase();
  if (letter !== key.correct) return `The Answer line names option ${letter ?? "none"} but the key is ${key.correct}. The solution must end at the keyed option.`;
  const keyedText = key.options[key.correct] ?? "";
  const keyedNumber = /\d/.test(keyedText) ? firstNumber(keyedText) : null;
  if (keyedNumber !== null && !numbersIn(answerLine.replace(/^answer\s*:?\s*\(?[A-D]\)?/i, "")).some((value) => Math.abs(value - keyedNumber) < 0.011))
    return `The Answer line does not show the keyed value (${key.options[key.correct]}).`;

  const wrongStart = lines.findIndex((line) => /^why not\b/i.test(line));
  if (wrongStart >= 0) {
    const praised = lines.slice(wrongStart + 1).some((line) => new RegExp(`^\\(${key.correct}\\)`, "i").test(line));
    if (praised) return `The "Why not the others" part lists option ${key.correct}, which is the correct one.`;
  }
  return null;
}

export function runCodeValidation(draft: QuestionDraft, verificationExpression?: string | null): { checks: ValidationCheck[]; conclusive: boolean } {
  const checks: ValidationCheck[] = [];
  const answerText = draft.options[draft.correct_answer];

  const thin = explanationProblem(draft.explanation, { correct: draft.correct_answer, options: draft.options });
  checks.push({ name: "explanation_detailed", passed: !thin, detail: thin ?? undefined });

  const numericOptions = optionKeys.map((key) => firstNumber(draft.options[key]));
  const allNumeric = numericOptions.every((value) => value !== null);
  if (allNumeric) {
    const distinct = new Set(numericOptions.map((value) => Math.round((value as number) * 1000))).size === 4;
    checks.push({ name: "numeric_options_distinct", passed: distinct, detail: distinct ? undefined : "Two options have the same numeric value." });
  }

  let conclusive = false;
  if (isNumericSubject(draft.subject)) {
    if (!verificationExpression) {
      checks.push({ name: "expression_present", passed: false, detail: "Quantitative questions need a verification expression." });
    } else {
      const computed = evaluateExpression(verificationExpression);
      const keyed = firstNumber(answerText);
      if (computed === null) {
        checks.push({ name: "expression_evaluates", passed: false, detail: "The verification expression could not be evaluated." });
      } else if (keyed === null) {
        checks.push({ name: "answer_is_numeric", passed: false, detail: "The keyed option contains no number to compare." });
      } else {
        const matches = Math.abs(Math.abs(computed) - Math.abs(keyed)) < 0.011 * Math.max(1, Math.abs(keyed) / 100);
        checks.push({ name: "expression_matches_key", passed: matches, detail: `computed ${Math.round(computed * 10000) / 10000}, keyed ${keyed}` });
        conclusive = matches;
      }
    }
  }
  return { checks, conclusive };
}
