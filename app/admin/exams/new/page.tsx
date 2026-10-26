import { AdminHeader, Field, Flash, SubmitButton, inputClass } from "@/components/admin/ui";
import { createExam } from "@/app/admin/exams/actions";

export const metadata = { title: "New exam" };

export default async function NewExamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div>
      <AdminHeader title="New exam" description="Add an exam such as UPSC CSE. You set its offer, pattern and test series next." />
      <Flash error={error} />
      <form action={createExam} className="grid max-w-xl gap-4 rounded-2xl border border-border bg-white p-5 shadow-soft">
        <Field label="Exam name"><input name="name" required maxLength={120} placeholder="UPSC CSE" className={inputClass} /></Field>
        <Field label="Web address (slug)" hint="Leave empty to build it from the name."><input name="slug" maxLength={80} className={inputClass} /></Field>
        <div><SubmitButton>Create exam</SubmitButton></div>
      </form>
    </div>
  );
}
