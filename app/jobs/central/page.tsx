import Link from "next/link";
import { ArrowRight, Landmark, SearchCheck } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { ButtonLink, EmptyState, SearchCommandBar, SectionHeading } from "@/components/design-system";
import { departmentLabels, departments } from "@/lib/data/catalog";
import { getJobs } from "@/lib/data/jobs";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'Central Govt Job and Exam Notifications 2026', description: 'Latest central government job and exam notifications from UPSC, SSC, Railways and PSUs with last dates, eligibility and official links.', path: '/jobs/central' });

export default async function CentralGovtJobsPage() {
  const jobs = await getJobs();
  const centralJobs = jobs.filter((job) => job.state.toLowerCase() === "central government");

  return (
    <div className="bg-surface">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <SectionHeading
            eyebrow="Central govt notifications"
            title="Central Govt Job and Exam Notifications"
            body="Browse verified central government notifications first, then narrow by department, qualification, deadline and eligibility status."
          />
          <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-white p-4 shadow-soft">
            <p className="text-sm font-black text-primary">Quick central paths</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {departments.slice(0, 6).map((department) => (
                <Link key={department} href={`/jobs/department/${department}`} className="rounded-2xl bg-surface px-3 py-2 text-sm font-black text-primary transition hover:bg-mint">
                  {departmentLabels[department]}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <SearchCommandBar compact />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            [Landmark, "Central only", "SSC, UPSC, Railways, PSUs and central ministries."],
            [SearchCheck, "Official-source checked", "Each notification card keeps official links visible."],
            [ArrowRight, "Eligibility next", "Move from notification to profile-aware matching."]
          ].map(([Icon, title, body]) => (
            <div key={title as string} className="rounded-3xl bg-white p-5 shadow-soft">
              <Icon className="text-success" size={22} aria-hidden="true" />
              <p className="mt-3 font-black text-primary">{title as string}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-muted">{body as string}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-muted">{centralJobs.length} central notifications found</p>
          <ButtonLink href="/jobs/state" variant="secondary">Browse State Govt Notifications</ButtonLink>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {centralJobs.length ? centralJobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />) : <EmptyState title="No central notifications found" body="Central notifications will appear here as verified data is connected." actionHref="/jobs" actionLabel="View all notifications" />}
        </div>
      </section>
    </div>
  );
}
