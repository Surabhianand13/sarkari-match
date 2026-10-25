import { Field, SubmitButton, inputClass } from "@/components/admin/ui";
import { saveOrganisation } from "@/app/admin/organisations/actions";

export type OrganisationFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  short_name?: string | null;
  organisation_type?: string | null;
  department_id?: string | null;
  state_id?: string | null;
  official_website?: string | null;
  description?: string | null;
  active?: boolean;
};

const types = ["central_board", "state_board", "ministry", "psu", "bank", "defence", "other"];

export function OrganisationForm({ values = {}, departments, states }: { values?: OrganisationFormValues; departments: Array<{ id: string; name: string }>; states: Array<{ id: string; name: string }> }) {
  return (
    <form action={saveOrganisation} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="id" defaultValue={values.id ?? ""} />
      <Field label="Name"><input name="name" required defaultValue={values.name} className={inputClass} /></Field>
      <Field label="Slug" hint="Leave empty to generate from the name."><input name="slug" defaultValue={values.slug} className={inputClass} /></Field>
      <Field label="Short name"><input name="short_name" defaultValue={values.short_name ?? ""} className={inputClass} /></Field>
      <Field label="Type">
        <select name="organisation_type" defaultValue={values.organisation_type ?? ""} className={inputClass}>
          <option value="">Not set</option>
          {types.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
        </select>
      </Field>
      <Field label="Department">
        <select name="department_id" defaultValue={values.department_id ?? ""} className={inputClass}>
          <option value="">Not set</option>
          {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <Field label="State">
        <select name="state_id" defaultValue={values.state_id ?? ""} className={inputClass}>
          <option value="">Not set</option>
          {states.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <Field label="Official website"><input name="official_website" type="url" defaultValue={values.official_website ?? ""} className={inputClass} /></Field>
      <label className="flex items-center gap-2 self-end text-sm font-black text-primary">
        <input type="checkbox" name="active" defaultChecked={values.active ?? true} className="size-4" /> Active (visible on the site)
      </label>
      <div className="md:col-span-2">
        <Field label="Description"><textarea name="description" rows={3} defaultValue={values.description ?? ""} className={inputClass} /></Field>
      </div>
      <div className="md:col-span-2"><SubmitButton>Save organisation</SubmitButton></div>
    </form>
  );
}
