import { Columns3 } from "lucide-react";
import { EmptyState, SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { robots: { index: false, follow: false } };

export default async function ComparePage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading eyebrow="Compare" title="Compare selected notifications" body="Compare deadlines, qualification, vacancies, salary, match status and official links before deciding where to apply." />
      <section className="rounded-[2rem] bg-white p-5 shadow-soft">
        <Columns3 className="text-brand-green" size={28} aria-hidden="true" />
        <EmptyState title="No notifications selected for comparison" body="Save two or more notifications to compare eligibility rules, deadlines and application requirements." actionHref="/jobs" actionLabel="Browse notifications" />
      </section>
    </div>
  );
}
