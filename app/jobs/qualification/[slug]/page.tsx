import type { Metadata } from "next";
import { JobCard } from "@/components/job-card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { EmptyState, SectionHeading } from "@/components/design-system";
import { qualificationPages } from "@/lib/data/catalog";
import { getJobs } from "@/lib/data/jobs";
import { hubDescription, hubHeading, hubPath, hubTitle, jobsForHub } from "@/lib/data/hubs";
import { breadcrumbJsonLd, buildMetadata, itemListJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export function generateStaticParams() {
  return qualificationPages.map((slug) => ({ slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const title = hubTitle("qualification", slug);
  const jobs = jobsForHub("qualification", await getJobs(), slug);
  return buildMetadata({
    title: hubHeading("qualification", title),
    description: hubDescription("qualification", title, jobs.length),
    path: hubPath("qualification", slug),
    noindex: jobs.length === 0
  });
}

export default async function QualificationPage({ params }: { params: Params }) {
  const { slug } = await params;
  const title = hubTitle("qualification", slug);
  const jobs = jobsForHub("qualification", await getJobs(), slug);
  const path = hubPath("qualification", slug);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Govt Job Notifications", path: "/jobs" },
    { name: "Qualifications", path: "/jobs/qualification" },
    { name: title, path }
  ];

  return (
    <div className="bg-surface">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd(hubHeading("qualification", title), jobs.map((job) => ({ name: job.title, path: `/jobs/${job.slug}` })))
        ]}
      />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Breadcrumbs items={crumbs} />
        <SectionHeading eyebrow="Qualification-wise notifications" title={hubHeading("qualification", title)} body="Check eligibility and apply through official links for verified notifications." />
        <p className="mt-5 text-sm font-bold text-muted">{jobs.length} notifications found</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.length ? jobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />) : <EmptyState title={`No ${title} notifications found`} body="Verified qualification-specific notifications will appear here as source data is connected." actionHref="/jobs/qualification" actionLabel="Browse all qualifications" />}
        </div>
      </section>
    </div>
  );
}
