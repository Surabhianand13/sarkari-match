import { evaluateExpression, firstNumber } from "./expression";
import { optionKeys, type QuestionDraft } from "@/lib/tests/question-schema";

export type ValidationCheck = { name: string; passed: boolean; detail?: string };

// Numeric subjects must show their working as an expression that reproduces the keyed option.
const numericSubjects = ["quantitative aptitude", "quant"];

export function isNumericSubject(subject: string) {
  return numericSubjects.includes(subject.trim().toLowerCase());
}

export function runCodeValidation(draft: QuestionDraft, verificationExpression?: string | null): { checks: ValidationCheck[]; conclusive: boolean } {
  const checks: ValidationCheck[] = [];
  const answerText = draft.options[draft.correct_answer];

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
