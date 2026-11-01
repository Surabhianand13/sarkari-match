import { Field, SubmitButton, inputClass } from "@/components/admin/ui";
import { saveQuestion } from "@/app/admin/questions/actions";

export type QuestionFormValues = {
  id?: string;
  exam?: string;
  tier?: string | null;
  subject?: string;
  topic?: string;
  difficulty?: string;
  stem?: string;
  options?: Record<string, string>;
  correct_option?: string;
  explanation?: string;
  est_time_seconds?: number;
  fact_as_of?: string | null;
  valid_until?: string | null;
};

export function QuestionForm({ values = {}, lockExam = false }: { values?: QuestionFormValues; lockExam?: boolean }) {
  const options = values.options ?? {};
  return (
    <form action={saveQuestion} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" defaultValue={values.id ?? ""} />
      {!lockExam && <Field label="Exam"><input name="exam" defaultValue={values.exam ?? "SSC CGL"} className={inputClass} /></Field>}
      <Field label="Tier"><input name="tier" defaultValue={values.tier ?? "Tier I"} className={inputClass} /></Field>
      <Field label="Subject"><input name="subject" required defaultValue={values.subject} className={inputClass} /></Field>
      <Field label="Topic"><input name="topic" required defaultValue={values.topic} className={inputClass} /></Field>
      <Field label="Difficulty">
        <select name="difficulty" defaultValue={values.difficulty ?? "moderate"} className={inputClass}>
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
        </select>
      </Field>
      <Field label="Time (seconds)"><input name="est_time_seconds" type="number" min="10" defaultValue={values.est_time_seconds ?? 60} className={inputClass} /></Field>
      <Field label="Facts true as of (optional)" hint="For current affairs and other facts that change."><input name="fact_as_of" type="date" defaultValue={values.fact_as_of ?? ""} className={inputClass} /></Field>
      <Field label="Re-check on (optional)" hint="After this date the question stays out of new tests and practice, and appears under Facts to re-check. Leave empty if it never expires."><input name="valid_until" type="date" defaultValue={values.valid_until ?? ""} className={inputClass} /></Field>
      <div className="md:col-span-2"><Field label="Question" hint="Tables: one row per line with | between cells, then a separator row |---|---|. Maths: √ π ² and ^ _ for powers and subscripts (x^2, a_1). Add a figure or picture on the review page after saving."><textarea name="question" required rows={5} defaultValue={values.stem} className={inputClass} /></Field></div>
      {["A", "B", "C", "D"].map((key) => (
        <Field key={key} label={`Option ${key}`}><input name={`option_${key}`} required defaultValue={options[key]} className={inputClass} /></Field>
      ))}
      <Field label="Correct option">
        <select name="correct_answer" defaultValue={values.correct_option ?? "A"} className={inputClass}>
          {["A", "B", "C", "D"].map((key) => <option key={key} value={key}>{key}</option>)}
        </select>
      </Field>
      <div className="md:col-span-2"><Field label="Explanation / solution"><textarea name="explanation" required rows={9} defaultValue={values.explanation} className={inputClass} /></Field></div>
      <div className="md:col-span-2"><SubmitButton>Save question</SubmitButton></div>
    </form>
  );
}
