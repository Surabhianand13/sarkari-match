import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { AdminHeader, Card, Field, Flash, SubmitButton, inputClass } from "@/components/admin/ui";
import { saveExam } from "@/app/admin/exams/actions";
import { adminDb } from "@/lib/admin/db";
import { getExamPattern } from "@/lib/exams/pattern";
import { getExamOffer } from "@/lib/offers";

export const metadata = { title: "Edit exam offer" };

export default async function EditExamPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string; error?: string }> }) {
  const [{ id }, { notice, error }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await adminDb();
  const exam = (await db.query<{ id: string; slug: string; name: string; active: boolean }>("select id, slug, name, active from exams where id = $1", [id])).rows[0];
  if (!exam) notFound();
  const [offer, pattern, series] = await Promise.all([
    getExamOffer(exam.id, db),
    getExamPattern(exam.slug),
    db.query<{ id: string; title: string; price_paise: number; status: string }>("select id, title, price_paise, status from test_series where exam_id = $1 order by title", [exam.id])
  ]);
  const rupees = (paise: number | null) => (paise === null ? "" : String(paise / 100));
  return (
    <div className="grid max-w-4xl gap-5">
      <AdminHeader title={exam.name} description="Pass, AI Study Guide and pattern for this exam." />
      <Flash notice={notice} error={error} />
      <form action={saveExam} className="grid gap-5">
        <input type="hidden" name="id" value={exam.id} />
        <Card title="Exam">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name"><input name="name" required defaultValue={exam.name} className={inputClass} /></Field>
            <label className="flex items-center gap-2 pt-7 text-sm font-black text-primary"><input type="checkbox" name="active" defaultChecked={exam.active} className="size-4" /> Active (shown on the site)</label>
          </div>
        </Card>
        <Card title="Exam Pass">
          <p className="mb-3 text-sm text-muted">The Pass price is the price of each test series below. A Pass grants access for the validity you set here.</p>
          <ul className="mb-4 grid gap-1 text-sm font-semibold text-primary">
            {series.rows.map((item) => <li key={item.id}>{item.title}: ₹{(item.price_paise / 100).toLocaleString("en-IN")} ({item.status})</li>)}
            {!series.rows.length && <li className="text-muted">No test series yet.</li>}
          </ul>
          <Link href={"/admin/tests" as Route} className="text-xs font-black text-primary underline">Edit series prices in Test series</Link>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Pass validity (days)" hint="365 = 12 months from purchase."><input name="pass_validity_days" type="number" min={1} defaultValue={offer.passValidityDays} className={inputClass} /></Field>
            <Field label="Second-exam discount (%)" hint="Applied to this exam's Pass for learners who already hold a paid Pass for another exam. 0 turns it off."><input name="second_exam_discount_percent" type="number" min={0} max={90} defaultValue={offer.secondExamDiscountPercent} className={inputClass} /></Field>
          </div>
        </Card>
        <Card title="AI Study Guide">
          <label className="mb-4 flex items-center gap-2 text-sm font-black text-primary"><input type="checkbox" name="guide_enabled" defaultChecked={offer.guideEnabled} className="size-4" /> Sell the AI Study Guide for this exam (only to learners with this exam&apos;s Pass)</label>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Price (₹)"><input name="guide_price" type="number" min={0} step="1" defaultValue={rupees(offer.guidePricePaise)} className={inputClass} /></Field>
            <Field label="MRP (₹, optional)"><input name="guide_mrp" type="number" min={0} step="1" defaultValue={rupees(offer.guideMrpPaise)} className={inputClass} /></Field>
            <Field label="Validity (days)"><input name="guide_validity_days" type="number" min={1} defaultValue={offer.guideValidityDays} className={inputClass} /></Field>
            <Field label="Daily messages per learner" hint="Fast model, cheap."><input name="ai_daily_fast_cap" type="number" min={0} defaultValue={offer.aiDailyFastCap} className={inputClass} /></Field>
            <Field label="Daily deeper explanations" hint="Stronger model, costs more."><input name="ai_daily_deep_cap" type="number" min={0} defaultValue={offer.aiDailyDeepCap} className={inputClass} /></Field>
          </div>
        </Card>
        <Card title="Exam pattern">
          <p className="mb-3 text-sm text-muted">Shown on the exam pages and given to the AI Study Guide. Leave empty if the pattern is not decided yet.</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Pattern name"><input name="pattern_name" defaultValue={pattern?.name ?? ""} placeholder="UPSC CSE Prelims" className={inputClass} /></Field>
            <Field label="Total questions"><input name="pattern_questions" type="number" min={1} defaultValue={pattern?.questions ?? ""} className={inputClass} /></Field>
            <Field label="Total marks"><input name="pattern_marks" type="number" min={1} defaultValue={pattern?.maxMarks ?? ""} className={inputClass} /></Field>
            <Field label="Minutes"><input name="pattern_minutes" type="number" min={1} defaultValue={pattern?.minutes ?? ""} className={inputClass} /></Field>
            <Field label="Marks per question"><input name="pattern_marks_per_question" type="number" min={0.25} step="0.25" defaultValue={pattern?.marksPerQuestion ?? ""} className={inputClass} /></Field>
            <Field label="Negative marks per wrong answer"><input name="pattern_negative" type="number" min={0} step="0.01" defaultValue={pattern?.negativeMarks ?? ""} className={inputClass} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Sections" hint="One per line: Name | questions | marks"><textarea name="pattern_sections" rows={5} defaultValue={pattern?.sections.map((section) => `${section.name} | ${section.questions} | ${section.marks}`).join("\n") ?? ""} className={`${inputClass} font-mono`} /></Field>
          </div>
        </Card>
        <div><SubmitButton>Save exam</SubmitButton></div>
      </form>
    </div>
  );
}
