import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, CalendarClock, MapPin, Users } from "lucide-react";
import type { JobPost } from "@/lib/data/catalog";

function deadline(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Compact notification card for the home page. The full card with eligibility preview lives on /jobs.
export function NotificationTile({ job }: { job: JobPost }) {
  const last = deadline(job.applicationEndDate);
  return (
    <Link href={`/jobs/${job.slug}` as Route} className="group flex h-full min-w-[17rem] snap-start flex-col rounded-3xl border border-border bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-[rgba(24,185,67,0.4)] hover:shadow-lift">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-mint px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-success">{job.applicationStatus === "open" ? "Open" : job.applicationStatus === "upcoming" ? "Upcoming" : "Closed"}</span>
        <ArrowUpRight size={18} className="text-muted transition group-hover:text-primary" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-lg font-black leading-snug text-primary">{job.title}</h3>
      <p className="mt-1 text-sm font-semibold text-muted">{job.organisation}</p>
      <dl className="mt-4 grid gap-2 text-sm font-semibold text-primary">
        <div className="flex items-center gap-2"><MapPin size={15} className="text-success" aria-hidden="true" /><dt className="sr-only">Location</dt><dd>{job.state}</dd></div>
        <div className="flex items-center gap-2"><Users size={15} className="text-success" aria-hidden="true" /><dt className="sr-only">Vacancies</dt><dd>{job.vacancyCount.toLocaleString("en-IN")} vacancies · {job.qualification}</dd></div>
        {last && <div className="flex items-center gap-2"><CalendarClock size={15} className="text-success" aria-hidden="true" /><dt className="sr-only">Last date</dt><dd>Last date {last}</dd></div>}
      </dl>
    </Link>
  );
}
