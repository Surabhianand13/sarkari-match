import { ClipboardCheck } from "lucide-react";
import { ButtonLink, EmptyState, SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";
import { applicationStatuses, statusLabel } from "@/lib/applications/tracker";

export const metadata = { robots: { index: false, follow: false } };

export default async function ApplicationsPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading eyebrow="Tracker" title="Application tracker" body="Track each application from saved to result, with notes and next-action dates." />
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] bg-white p-5 shadow-soft">
          <ClipboardCheck className="text-brand-green" size={28} aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black text-primary">Add your first tracked application</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Application tracking is coming soon. The live form will save status, application number, applied date, notes and next action date.</p>
          <ButtonLink href="/jobs" className="mt-5">Choose a notification to track</ButtonLink>
        </section>
        <section className="rounded-[2rem] bg-surface p-5">
          <h2 className="text-lg font-black text-primary">Supported statuses</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {applicationStatuses.map((status) => (
              <span key={status} className="rounded-2xl bg-white px-3 py-2 text-sm font-bold text-muted shadow-soft">{statusLabel(status)}</span>
            ))}
          </div>
        </section>
      </div>
      <div className="mt-5">
        <EmptyState title="No applications yet" body="Once you apply on an official website, track the application number, fee status, admit card and result stages here." />
      </div>
    </div>
  );
}
