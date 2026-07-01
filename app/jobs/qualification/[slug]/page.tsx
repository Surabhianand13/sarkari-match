import { JobCard } from "@/components/job-card";
import { demoJobs, qualificationLabels } from "@/lib/data/catalog";
import { EmptyState, SectionHeading } from "@/components/design-system";

export default async function QualificationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = qualificationLabels[slug] ?? slug;
  const jobs = demoJobs.filter((job) => job.qualification.toLowerCase() === title.toLowerCase() || job.qualification.toLowerCase().replaceAll(".", "").replaceAll("/", "") === slug);

  return (
    <div className="bg-surface">
      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeading eyebrow="Qualification-wise notifications" title={`Latest ${title} Govt Job Notifications 2026`} body="Check eligibility and apply through official links for verified notifications." />
        <p className="mt-5 text-sm font-bold text-muted">{jobs.length} notifications found</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.length ? jobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />) : <EmptyState title={`No ${title} notifications found`} body="Verified qualification-specific notifications will appear here as source data is connected." actionHref="/jobs/qualification" actionLabel="Browse all qualifications" />}
        </div>
      </section>
    </div>
  );
}
