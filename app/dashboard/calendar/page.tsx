import { CalendarDays, Download } from "lucide-react";
import { ButtonLink, SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";
import { buildDeadlineEvents } from "@/lib/calendar/events";
import { getJobs } from "@/lib/data/jobs";
import { formatDate } from "@/lib/utils/format";

export const metadata = { robots: { index: false, follow: false } };

export default async function CalendarPage() {
  await requireUser();
  const jobs = await getJobs();
  const events = jobs.flatMap(buildDeadlineEvents);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading eyebrow="Calendar" title="Personal exam notification calendar" body="Deadline reminders and saved notification dates are grouped into one mobile-friendly calendar." />
      <div className="grid gap-4 lg:grid-cols-2">
        {events.map((event) => (
          <article key={event.uid} className="rounded-3xl bg-white p-5 shadow-soft">
            <CalendarDays className="text-brand-green" size={24} aria-hidden="true" />
            <h2 className="mt-3 font-black text-primary">{event.title}</h2>
            <p className="mt-1 text-sm font-bold text-muted">{formatDate(event.startsAt)}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{event.description}</p>
          </article>
        ))}
      </div>
      <ButtonLink href="/dashboard/calendar/export.ics" variant="secondary" className="mt-5">
        <Download size={16} aria-hidden="true" /> Export calendar
      </ButtonLink>
    </div>
  );
}
