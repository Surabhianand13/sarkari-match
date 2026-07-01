import { JobCard } from "@/components/job-card";
import { stateLabels } from "@/lib/data/catalog";
import { getJobs } from "@/lib/data/jobs";
import { EmptyState, SectionHeading } from "@/components/design-system";

export default async function StatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = stateLabels[slug] ?? slug;
  const allJobs = await getJobs();
  const jobs = allJobs.filter((job) => job.state.toLowerCase().replaceAll(" ", "-") === slug);

  return (
    <div className="bg-surface">
      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeading eyebrow="State Govt Job Notifications" title={`${title} Govt Job Notifications`} body="Browse state-specific notifications with domicile, language, qualification and eligibility context." />
        <p className="mt-5 text-sm font-bold text-muted">{jobs.length} notifications found</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.length ? jobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />) : <EmptyState title={`No ${title} notifications found`} body="Verified state notifications will appear here as source data is connected." actionHref="/jobs/state" actionLabel="Browse all states" />}
        </div>
      </section>
    </div>
  );
}
