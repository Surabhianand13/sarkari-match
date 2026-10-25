import { notFound } from "next/navigation";
import { AdminHeader, Card, Field, Flash, SubmitButton, inputClass } from "@/components/admin/ui";
import { savePost } from "@/app/admin/posts/actions";
import { adminDb } from "@/lib/admin/db";
import { rulesTemplate } from "@/lib/matching/rules-schema";

export const metadata = { title: "Notification post" };

export default async function PostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string; recruitment?: string }> }) {
  const { id } = await params;
  const { notice, error, recruitment } = await searchParams;
  const db = await adminDb();
  const recruitments = (await db.query<{ id: string; title: string }>("select id, title from recruitments order by updated_at desc limit 300")).rows;

  let values: Record<string, unknown> = { recruitment_id: recruitment ?? "", application_status: "open", eligibility_rules: rulesTemplate, active: false };
  if (id !== "new") {
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const { rows } = await db.query("select * from job_posts where id = $1", [id]);
    if (!rows[0]) notFound();
    values = { ...rows[0], eligibility_rules: JSON.stringify(rows[0].eligibility_rules ?? {}, null, 2) };
  }
  const v = (key: string) => String(values[key] ?? "");

  return (
    <div className="grid gap-4">
      <AdminHeader title={id === "new" ? "New post" : v("title")} description="A post is one notification page. It is public only when the post is published and its recruitment is published." />
      <Flash notice={notice} error={error} />
      <Card>
        <form action={savePost} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" defaultValue={id === "new" ? "" : id} />
          <Field label="Recruitment">
            <select name="recruitment_id" required defaultValue={v("recruitment_id")} className={inputClass}>
              <option value="">Choose...</option>
              {recruitments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </Field>
          <Field label="Post title"><input name="title" required defaultValue={v("title")} className={inputClass} /></Field>
          <Field label="Slug" hint="Becomes /jobs/slug. Leave empty to generate."><input name="slug" defaultValue={v("slug")} className={inputClass} /></Field>
          <Field label="Post code"><input name="post_code" defaultValue={v("post_code")} className={inputClass} /></Field>
          <Field label="Vacancies"><input name="vacancy_count" type="number" min="0" defaultValue={v("vacancy_count")} className={inputClass} /></Field>
          <Field label="Pay / salary"><input name="salary_text" defaultValue={v("salary_text")} className={inputClass} /></Field>
          <Field label="Application status">
            <select name="application_status" defaultValue={v("application_status")} className={inputClass}>
              <option value="open">Open</option>
              <option value="upcoming">Upcoming</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end text-sm font-black text-primary">
            <input type="checkbox" name="publish" defaultChecked={Boolean(values.active)} className="size-4" /> Publish this post
          </label>
          <div className="md:col-span-2"><Field label="Description" hint="Plain text shown on the notification page overview."><textarea name="description" rows={4} defaultValue={v("description")} className={inputClass} /></Field></div>
          <div className="md:col-span-2">
            <Field label="Eligibility rules (JSON)" hint="Checked by the matching engine. Each rule needs ruleText, which is shown to candidates. Qualification levels: 8th-pass, 10th-pass, 12th-pass, iti, diploma, graduate, btech, postgraduate, nursing, teaching, law.">
              <textarea name="eligibility_rules" rows={16} defaultValue={v("eligibility_rules")} className={`${inputClass} font-mono text-xs`} spellCheck={false} />
            </Field>
          </div>
          <div className="md:col-span-2"><SubmitButton>Save post</SubmitButton></div>
        </form>
      </Card>
    </div>
  );
}
