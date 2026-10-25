import { Field, SubmitButton, inputClass } from "@/components/admin/ui";
import { saveRecruitment } from "@/app/admin/recruitments/actions";

export type RecruitmentValues = Record<string, string | null | undefined> & { id?: string };

export function RecruitmentForm({ values = {}, organisations }: { values?: RecruitmentValues; organisations: Array<{ id: string; name: string }> }) {
  const v = (key: string) => values[key] ?? "";
  return (
    <form action={saveRecruitment} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" defaultValue={values.id ?? ""} />
      <Field label="Organisation">
        <select name="organisation_id" required defaultValue={v("organisation_id")} className={inputClass}>
          <option value="">Choose...</option>
          {organisations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select>
      </Field>
      <Field label="Recruitment title"><input name="title" required defaultValue={v("title")} className={inputClass} /></Field>
      <Field label="Slug" hint="Leave empty to generate from the title."><input name="slug" defaultValue={v("slug")} className={inputClass} /></Field>
      <Field label="Notification number"><input name="notification_number" defaultValue={v("notification_number")} className={inputClass} /></Field>
      <Field label="Notification date"><input name="notification_date" type="date" defaultValue={v("notification_date")} className={inputClass} /></Field>
      <Field label="Applications open"><input name="application_start_date" type="date" defaultValue={v("application_start_date")} className={inputClass} /></Field>
      <Field label="Last date to apply"><input name="application_end_date" type="date" defaultValue={v("application_end_date")} className={inputClass} /></Field>
      <Field label="Official notification link"><input name="official_notification_url" type="url" defaultValue={v("official_notification_url")} className={inputClass} /></Field>
      <Field label="Official application link"><input name="official_application_url" type="url" defaultValue={v("official_application_url")} className={inputClass} /></Field>
      <Field label="Official website"><input name="official_website_url" type="url" defaultValue={v("official_website_url")} className={inputClass} /></Field>
      <div className="md:col-span-2"><Field label="Summary"><textarea name="summary" rows={3} defaultValue={v("summary")} className={inputClass} /></Field></div>
      <div className="md:col-span-2"><Field label="Verification notes" hint="Required to publish: what you checked against the official notification."><textarea name="verification_notes" rows={3} defaultValue={v("verification_notes")} className={inputClass} /></Field></div>
      <div className="md:col-span-2"><SubmitButton>Save recruitment</SubmitButton></div>
    </form>
  );
}
