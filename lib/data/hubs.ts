import { departmentLabels, qualificationLabels, stateLabels, type JobPost } from "@/lib/data/catalog";

export type HubKind = "state" | "department" | "qualification";

export function hubTitle(kind: HubKind, slug: string) {
  if (kind === "state") return stateLabels[slug] ?? slug;
  if (kind === "department") return departmentLabels[slug] ?? slug;
  return qualificationLabels[slug] ?? slug;
}

export function jobsForState(jobs: JobPost[], slug: string) {
  return jobs.filter((job) => job.state.toLowerCase().replaceAll(" ", "-") === slug);
}

export function jobsForDepartment(jobs: JobPost[], slug: string) {
  const title = hubTitle("department", slug).toLowerCase();
  return jobs.filter((job) => job.department.toLowerCase() === title || job.department.toLowerCase() === slug);
}

export function jobsForQualification(jobs: JobPost[], slug: string) {
  const title = hubTitle("qualification", slug).toLowerCase();
  return jobs.filter((job) => job.qualification.toLowerCase() === title || job.qualification.toLowerCase().replaceAll(".", "").replaceAll("/", "") === slug);
}

export function jobsForHub(kind: HubKind, jobs: JobPost[], slug: string) {
  if (kind === "state") return jobsForState(jobs, slug);
  if (kind === "department") return jobsForDepartment(jobs, slug);
  return jobsForQualification(jobs, slug);
}

export function hubHeading(kind: HubKind, title: string) {
  if (kind === "qualification") return `Latest ${title} Govt Job Notifications 2026`;
  return `${title} Govt Job Notifications 2026`;
}

export function hubDescription(kind: HubKind, title: string, count: number) {
  const scope = kind === "state" ? `${title} state` : kind === "department" ? `${title}` : `${title}-qualified candidates`;
  return `${count} verified ${scope} govt job and exam notifications with eligibility, last dates and official application links. Check your eligibility free on Sarkari Match by PW.`;
}

export function hubPath(kind: HubKind, slug: string) {
  return `/jobs/${kind}/${slug}`;
}
