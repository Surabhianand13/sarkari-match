import type { MetadataRoute } from "next";
import { departments, qualificationPages, states, type JobPost } from "@/lib/data/catalog";
import { jobsForDepartment, jobsForQualification, jobsForState } from "@/lib/data/hubs";
import { getJobs } from "@/lib/data/jobs";
import { absoluteUrl } from "@/lib/brand";
import { getPublishedPosts } from "@/lib/blog";
import { isStaleClosedJob, latestDate, sitemapDate } from "@/lib/seo";
import { getPublishedSeries, getSampleTests } from "@/lib/tests/catalog";

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

// Google ignores priority and changeFrequency, so entries carry a URL and, only when it is known, a true last-modified date.
function entry(path: string, lastModified?: Date): Entry {
  return lastModified ? { url: absoluteUrl(path), lastModified } : { url: absoluteUrl(path) };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allJobs = await getJobs();
  const series = await getPublishedSeries();
  const jobs = allJobs.filter((job) => !isStaleClosedJob(job));
  const jobDate = (job: { verifiedAt: string; publishedAt: string }) => sitemapDate(job.verifiedAt) ?? sitemapDate(job.publishedAt);
  const freshest = latestDate(jobs.flatMap((job) => [job.verifiedAt, job.publishedAt]));

  const core: MetadataRoute.Sitemap = [
    entry("/", freshest),
    entry("/tests"),
    entry("/practice"),
    entry("/blog"),
    entry("/jobs", freshest),
    entry("/jobs/central", freshest),
    entry("/jobs/state", freshest),
    entry("/jobs/qualification", freshest),
    entry("/jobs/department", freshest),
    ...["/eligibility", "/pricing", "/how-it-works", "/about", "/editorial-policy", "/corrections", "/contact", "/privacy", "/terms", "/refund-policy"].map((path) => entry(path))
  ];

  const notificationPages = jobs.map((job) => entry(`/jobs/${job.slug}`, jobDate(job)));

  // Only hubs that actually list notifications are submitted, so thin pages never reach the index.
  // Each hub is dated by its own newest notification, not by the newest one on the whole site.
  const hubs: Array<[string, JobPost[]]> = [
    ...qualificationPages.map((slug): [string, JobPost[]] => [`/jobs/qualification/${slug}`, jobsForQualification(jobs, slug)]),
    ...states.map((slug): [string, JobPost[]] => [`/jobs/state/${slug}`, jobsForState(jobs, slug)]),
    ...departments.map((slug): [string, JobPost[]] => [`/jobs/department/${slug}`, jobsForDepartment(jobs, slug)])
  ];
  const hubPages = hubs.filter(([, hubJobs]) => hubJobs.length).map(([path, hubJobs]) => entry(path, latestDate(hubJobs.flatMap((job) => [job.verifiedAt, job.publishedAt]))));

  const testPages: MetadataRoute.Sitemap = [];
  const exams = new Set<string>();
  for (const item of series) {
    exams.add(item.examSlug);
    testPages.push(entry(`/tests/${item.examSlug}/${item.slug}`, sitemapDate(item.publishedAt)));
    for (const test of await getSampleTests(item.id)) testPages.push(entry(`/tests/${item.examSlug}/${item.slug}/${test.slug}`));
  }
  for (const exam of exams) testPages.push(entry(`/tests/${exam}`));

  const blogPages = (await getPublishedPosts(500)).map((post) => entry(`/blog/${post.slug}`, sitemapDate(post.updatedAt)));

  return [...core, ...testPages, ...blogPages, ...notificationPages, ...hubPages];
}
