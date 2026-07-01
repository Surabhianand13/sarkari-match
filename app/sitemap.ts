import type { MetadataRoute } from "next";
import { departments, qualificationPages, states } from "@/lib/data/catalog";
import { getJobs } from "@/lib/data/jobs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarkarimatch.com";
  const staticRoutes = ["", "/jobs", "/eligibility", "/pricing", "/about", "/how-it-works", "/editorial-policy", "/corrections", "/privacy", "/terms", "/refund-policy", "/contact", "/report-error"];
  const jobs = await getJobs();
  return [
    ...staticRoutes.map((route) => ({ url: `${siteUrl}${route}`, lastModified: new Date() })),
    ...jobs.map((job) => ({ url: `${siteUrl}/jobs/${job.slug}`, lastModified: new Date(job.verifiedAt) })),
    ...qualificationPages.map((slug) => ({ url: `${siteUrl}/jobs/qualification/${slug}`, lastModified: new Date() })),
    ...states.map((slug) => ({ url: `${siteUrl}/jobs/state/${slug}`, lastModified: new Date() })),
    ...departments.map((slug) => ({ url: `${siteUrl}/jobs/department/${slug}`, lastModified: new Date() }))
  ];
}
