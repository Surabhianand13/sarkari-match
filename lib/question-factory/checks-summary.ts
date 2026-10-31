// Turns a question's saved check results into a short, plain list for the review screen.

export type CheckLine = { label: string; state: "pass" | "fail" | "flag" | "none"; detail?: string };

type Notes = {
  checks?: Array<{ name: string; passed: boolean; detail?: string }>;
  proven?: boolean;
  solver?: { model: string; agrees: boolean; ambiguous: boolean; answer: string | null } | null;
  language?: { fixes?: string[]; issues?: string[] };
  syllabus?: { in_syllabus: boolean | null; level?: string; reason?: string };
  review?: { in_syllabus?: boolean; level?: string; reason?: string };
  flags?: string[];
  reasons?: string[];
  fix_history?: string[];
  recheck?: { previous_status: string };
  error?: string;
};

export function summariseChecks(input: unknown): CheckLine[] {
  const notes = (input && typeof input === "object" ? input : {}) as Notes;
  const lines: CheckLine[] = [];
  const check = (name: string) => notes.checks?.find((item) => item.name === name);

  const expression = check("expression_matches_key");
  if (expression) lines.push({ label: notes.proven ? "Answer proven by exact arithmetic" : "Arithmetic matches the key", state: expression.passed ? "pass" : "fail", detail: expression.detail });
  const distinct = check("numeric_options_distinct");
  if (distinct) lines.push({ label: "Numeric options are all different", state: distinct.passed ? "pass" : "fail", detail: distinct.detail });

  const solution = check("explanation_detailed");
  lines.push(
    solution
      ? { label: "Solution is step by step and ends at the keyed option", state: solution.passed ? "pass" : "fail", detail: solution.detail }
      : { label: "Solution check", state: "none", detail: "Not run. This question was made before solutions were checked." }
  );

  const figure = check("no_missing_figure");
  if (figure) lines.push({ label: "Needs no figure or picture", state: figure.passed ? "pass" : "fail", detail: figure.detail });
  const grounded = check("uses_the_data");
  if (grounded) lines.push({ label: "Working uses the data", state: grounded.passed ? "pass" : "fail", detail: grounded.detail });
  const formatting = [check("question_formatting"), check("solution_formatting")].find((item) => item && !item.passed) ?? check("question_formatting");
  if (formatting) lines.push({ label: "Tables and maths can be shown", state: formatting.passed ? "pass" : "fail", detail: formatting.detail });

  if (notes.solver) lines.push({ label: `Independent solver (${notes.solver.model})`, state: notes.solver.agrees && !notes.solver.ambiguous ? "pass" : "fail", detail: notes.solver.agrees ? (notes.solver.ambiguous ? "Agreed, but found more than one defensible answer." : "Chose the same option as the key.") : `Chose ${notes.solver.answer ?? "no option"} instead.` });
  else if (!notes.proven) lines.push({ label: "Independent solver", state: "none", detail: "Did not run." });

  if (notes.language) {
    const issues = notes.language.issues ?? [];
    lines.push({ label: "Spelling and wording", state: issues.length ? "flag" : "pass", detail: issues.length ? issues.join(" ") : notes.language.fixes?.length ? `Fixed: ${notes.language.fixes.join(", ")}.` : "Clean." });
  }

  const syllabus = notes.syllabus;
  if (syllabus) {
    const text = [syllabus.in_syllabus === false ? "Topic not found in the syllabus text." : syllabus.in_syllabus === true ? "Inside the syllabus." : "No syllabus on file to compare.", syllabus.level ? `Level: ${syllabus.level.replace("_", " ")}.` : "", syllabus.reason ?? ""].filter(Boolean).join(" ");
    lines.push({ label: "Syllabus and level", state: syllabus.in_syllabus === false || syllabus.level === "harder" ? "flag" : syllabus.in_syllabus === true ? "pass" : "none", detail: text });
  }

  for (const flag of notes.flags ?? []) lines.push({ label: "Needs a person", state: "flag", detail: flag });
  if (notes.fix_history?.length) lines.push({ label: `Repaired ${notes.fix_history.length} time${notes.fix_history.length === 1 ? "" : "s"}`, state: "none", detail: notes.fix_history.join(" | ") });
  if (notes.recheck) lines.push({ label: "Re-checked", state: "none", detail: `Was ${notes.recheck.previous_status.replace("_", " ")} before this re-check.` });
  for (const reason of notes.reasons ?? []) lines.push({ label: "Failed", state: "fail", detail: reason });
  if (notes.error) lines.push({ label: "Error", state: "fail", detail: notes.error });
  return lines;
}
