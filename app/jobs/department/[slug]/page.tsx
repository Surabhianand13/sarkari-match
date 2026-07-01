import { JobCard } from "@/components/job-card";
import { demoJobs, departmentLabels } from "@/lib/data/catalog";
import { EmptyState, SectionHeading } from "@/components/design-system";

export default async function DepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = departmentLabels[slug] ?? slug;
  const jobs = demoJobs.filter((job) => job.department.toLowerCase() === title.toLowerCase() || job.department.toLowerCase() === slug);

  return (
    <div className="bg-surface">
      <section className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeading eyebrow="Department-wise notifications" title={`${title} Govt Job Notifications`} body="Explore department-specific notifications with official-source context and eligibility next steps." />
        <p className="mt-5 text-sm font-bold text-muted">{jobs.length} notifications found</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.length ? jobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />) : <EmptyState title={`No ${title} notifications found`} body="Verified department notifications will appear here as source data is connected." actionHref="/jobs/department" actionLabel="Browse all departments" />}
        </div>
      </section>
    </div>
  );
}
