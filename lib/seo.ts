import type { Metadata } from "next";
import { absoluteUrl, brand } from "@/lib/brand";

type BuildMetadataInput = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  type?: "website" | "article";
};

export function buildMetadata({ title, description, path, noindex = false, type = "website" }: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: brand.fullName,
      type,
      locale: brand.locale
    },
    twitter: { card: "summary_large_image", title, description },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true }
  };
}

// Sitemap lastmod is only useful when it is true, so a missing or invalid date is left out instead of defaulting to now.
export function sitemapDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function latestDate(values: ReadonlyArray<string | null | undefined>): Date | undefined {
  let latest: Date | undefined;
  for (const value of values) {
    const date = sitemapDate(value);
    if (date && (!latest || date > latest)) latest = date;
  }
  return latest;
}

export const CLOSED_JOB_SITEMAP_GRACE_DAYS = 30;

// A closed notification stays on the site and indexable, but stops being submitted once its last date is well past.
export function isStaleClosedJob(job: { applicationStatus: string; applicationEndDate: string }, now = new Date()) {
  if (job.applicationStatus !== "closed") return false;
  const end = sitemapDate(job.applicationEndDate);
  return Boolean(end) && now.getTime() - end!.getTime() > CLOSED_JOB_SITEMAP_GRACE_DAYS * 86_400_000;
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: brand.fullName,
    alternateName: [brand.name, "SarkariMatch"],
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/sarkarimatch-icon-512.png"),
    description: brand.shortDescription,
    areaServed: { "@type": "Country", name: "India" }
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: brand.fullName,
    url: absoluteUrl("/"),
    inLanguage: "en-IN",
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/jobs")}?q={search_term_string}` },
      "query-input": "required name=search_term_string"
    }
  };
}

export function faqJsonLd(items: ReadonlyArray<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer }
    }))
  };
}

export function itemListJsonLd(name: string, items: ReadonlyArray<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path)
    }))
  };
}

export function productJsonLd(input: { name: string; description: string; path: string; pricePaise: number; mrpPaise?: number | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    brand: { "@type": "Brand", name: brand.fullName },
    offers: {
      "@type": "Offer",
      price: (input.pricePaise / 100).toFixed(2),
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(input.path),
      seller: { "@id": absoluteUrl("/#organization") }
    }
  };
}

export function courseJsonLd(input: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    provider: { "@type": "Organization", name: brand.fullName, url: absoluteUrl("/") },
    inLanguage: "en-IN"
  };
}

export function articleJsonLd(input: { title: string; description: string; path: string; author: string; publishedAt: string | null; updatedAt: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: input.publishedAt ?? undefined,
    dateModified: input.updatedAt,
    author: { "@type": "Organization", name: input.author },
    publisher: { "@id": absoluteUrl("/#organization") },
    inLanguage: "en-IN"
  };
}
