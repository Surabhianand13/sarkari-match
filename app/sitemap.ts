import type { MetadataRoute } from "next";
import { departments, qualificationPages, states } from "@/lib/data/catalog";
import { jobsForDepartment, jobsForQualification, jobsForState } from "@/lib/data/hubs";
import { getJobs } from "@/lib/data/jobs";
import { absoluteUrl } from "@/lib/brand";
import { getPublishedSeries, getSeriesTests } from "@/lib/tests/catalog";

export const revalidate = 3600;

function safeDate(value: string | undefined) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await getJobs();
  const series = await getPublishedSeries();
  const latest = jobs.reduce((max, job) => (safeDate(job.verifiedAt) > max ? safeDate(job.verifiedAt) : max), new Date(0));
  const freshest = latest.getTime() > 0 ? latest : new Date();

  const core: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: freshest, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/tests"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/jobs"), lastModified: freshest, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/jobs/central"), lastModified: freshest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/jobs/state"), lastModified: freshest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/jobs/qualification"), lastModified: freshest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/jobs/department"), lastModified: freshest, changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/eligibility"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/pricing"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/how-it-works"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/editorial-policy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/corrections"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/refund-policy"), changeFrequency: "yearly", priority: 0.2 }
  ];

  const notificationPages: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: absoluteUrl(`/jobs/${job.slug}`),
    lastModified: safeDate(job.verifiedAt),
    changeFrequency: "daily",
    priority: 0.9
  }));

  // Only hubs that actually list notifications are submitted, so thin pages never reach the index.
  const hubPages: MetadataRoute.Sitemap = [
    ...qualificationPages.filter((slug) => jobsForQualification(jobs, slug).length).map((slug) => `/jobs/qualification/${slug}`),
    ...states.filter((slug) => jobsForState(jobs, slug).length).map((slug) => `/jobs/state/${slug}`),
    ...departments.filter((slug) => jobsForDepartment(jobs, slug).length).map((slug) => `/jobs/department/${slug}`)
  ].map((path) => ({ url: absoluteUrl(path), lastModified: freshest, changeFrequency: "daily", priority: 0.7 }));

  const testPages: MetadataRoute.Sitemap = [];
  const exams = new Set<string>();
  for (const item of series) {
    exams.add(item.examSlug);
    testPages.push({ url: absoluteUrl(`/tests/${item.examSlug}/${item.slug}`), lastModified: safeDate(item.publishedAt ?? undefined), changeFrequency: "weekly", priority: 0.95 });
    for (const test of await getSeriesTests(item.id)) testPages.push({ url: absoluteUrl(`/tests/${item.examSlug}/${item.slug}/${test.slug}`), changeFrequency: "weekly", priority: 0.8 });
  }
  for (const exam of exams) testPages.push({ url: absoluteUrl(`/tests/${exam}`), changeFrequency: "weekly", priority: 0.9 });

  return [...core, ...testPages, ...notificationPages, ...hubPages];
}
