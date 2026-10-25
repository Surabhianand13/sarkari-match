import type { Metadata } from "next";
import { JobCard } from "@/components/job-card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { EmptyState, SectionHeading } from "@/components/design-system";
import { states } from "@/lib/data/catalog";
import { getJobs } from "@/lib/data/jobs";
import { hubDescription, hubHeading, hubPath, hubTitle, jobsForHub } from "@/lib/data/hubs";
import { breadcrumbJsonLd, buildMetadata, itemListJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export function generateStaticParams() {
  return states.map((slug) => ({ slug }));
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const title = hubTitle("state", slug);
  const jobs = jobsForHub("state", await getJobs(), slug);
  return buildMetadata({
    title: hubHeading("state", title),
    description: hubDescription("state", title, jobs.length),
    path: hubPath("state", slug),
    noindex: jobs.length === 0
  });
}

export default async function StatePage({ params }: { params: Params }) {
  const { slug } = await params;
  const title = hubTitle("state", slug);
  const jobs = jobsForHub("state", await getJobs(), slug);
  const path = hubPath("state", slug);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Govt Job Notifications", path: "/jobs" },
    { name: "State Govt Jobs", path: "/jobs/state" },
    { name: title, path }
  ];

  return (
    <div className="bg-surface">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          itemListJsonLd(hubHeading("state", title), jobs.map((job) => ({ name: job.title, path: `/jobs/${job.slug}` })))
        ]}
      />
      <section className="mx-auto max-w-7xl px-4 py-10">
        <Breadcrumbs items={crumbs} />
        <SectionHeading eyebrow="State Govt Job Notifications" title={hubHeading("state", title)} body="Browse state-specific notifications with domicile, language, qualification and eligibility context." />
        <p className="mt-5 text-sm font-bold text-muted">{jobs.length} notifications found</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.length ? jobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />) : <EmptyState title={`No ${title} notifications found`} body="Verified state notifications will appear here as source data is connected." actionHref="/jobs/state" actionLabel="Browse all states" />}
        </div>
      </section>
    </div>
  );
}
