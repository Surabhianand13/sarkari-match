import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, GraduationCap, Landmark, MapPinned, Wand2 } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { departmentLabels, departments, qualificationLabels, qualificationPages, stateLabels, states } from "@/lib/data/catalog";
import { getJobs } from "@/lib/data/jobs";
import { EmptyState, SearchCommandBar, SectionHeading } from "@/components/design-system";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Latest Govt Job and Exam Notifications 2026",
  description: "Search and filter active govt job and exam notifications by qualification, state, department and closing date. Verified, with official application links.",
  path: "/jobs"
});

const discoveryCards = [
  ["/jobs/central", Landmark, "Central Govt", "UPSC, SSC, Railways, PSUs"],
  ["/jobs/state", MapPinned, "State Govt", "Choose state first"],
  ["/jobs/qualification", GraduationCap, "Qualifications", "Browse by education"],
  ["/jobs/department", BriefcaseBusiness, "Departments", "Browse by board"],
  ["/eligibility", Wand2, "Eligibility match", "See only what you can apply for"]
] as const;

export default async function JobsPage({ searchParams }: { searchParams?: Promise<{ q?: string; state?: string; department?: string; qualification?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams?.q?.toLowerCase();
  const state = resolvedSearchParams?.state?.toLowerCase();
  const department = resolvedSearchParams?.department?.toLowerCase();
  const qualification = resolvedSearchParams?.qualification?.toLowerCase();
  const allJobs = await getJobs();
  const jobs = allJobs.filter((job) => {
    if (q && ![job.title, job.recruitmentTitle, job.organisation, job.department, job.state, job.qualification].join(" ").toLowerCase().includes(q)) return false;
    if (state && !job.state.toLowerCase().includes(state.replaceAll("-", " "))) return false;
    if (department && job.department.toLowerCase() !== department) return false;
    if (qualification && job.qualification.toLowerCase() !== qualification) return false;
    return true;
  });

  return (
    <div className="bg-surface">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <SectionHeading eyebrow="Discover" title="Govt exam and job notifications" body="Search verified notifications and preserve filter state through shareable URLs." />
        <div className="mb-6 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          {discoveryCards.map(([href, Icon, title, body]) => (
            <Link key={href} href={href} className="group rounded-3xl border border-[color:var(--border)] bg-white p-4 shadow-soft transition hover:-translate-y-1 hover:border-[color:var(--brand-green)]">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-mint text-success"><Icon size={19} aria-hidden="true" /></span>
                <ArrowRight className="text-muted transition group-hover:translate-x-1 group-hover:text-primary" size={17} aria-hidden="true" />
              </div>
              <p className="mt-3 font-black text-primary">{title}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{body}</p>
            </Link>
          ))}
        </div>
        <SearchCommandBar compact />
        <details className="mt-4 rounded-3xl border border-[color:var(--border)] bg-white p-4 shadow-soft">
          <summary className="cursor-pointer text-sm font-black text-primary">Filters and sorting</summary>
          <form className="mt-4 grid gap-3 md:grid-cols-5">
            <input name="q" defaultValue={resolvedSearchParams?.q} placeholder="Search notifications" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold md:col-span-2" />
            <select name="state" defaultValue={resolvedSearchParams?.state ?? ""} className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold">
              <option value="">All states</option>
              {states.map((item) => <option key={item} value={item}>{stateLabels[item]}</option>)}
            </select>
            <select name="qualification" defaultValue={resolvedSearchParams?.qualification ?? ""} className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold">
              <option value="">All qualifications</option>
              {qualificationPages.map((item) => <option key={item} value={qualificationLabels[item].toLowerCase()}>{qualificationLabels[item]}</option>)}
            </select>
            <select name="department" defaultValue={resolvedSearchParams?.department ?? ""} className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold">
              <option value="">All departments</option>
              {departments.map((item) => <option key={item} value={departmentLabels[item].toLowerCase()}>{departmentLabels[item]}</option>)}
            </select>
            <button className="min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-4 py-2 font-black text-white">Apply filters</button>
          </form>
          <Link href="/jobs" className="mt-3 inline-flex text-sm font-black text-primary">Reset filters</Link>
        </details>
        <p className="mt-5 text-sm font-bold text-muted">{jobs.length} notifications found</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.length ? jobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />) : <EmptyState title="No notifications found" body="Try a broader keyword, remove a filter, or browse by qualification." actionHref="/jobs/qualification/graduate" actionLabel="Browse graduate notifications" />}
        </div>
      </section>
    </div>
  );
}
