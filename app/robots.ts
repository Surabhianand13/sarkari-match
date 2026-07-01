import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarkarimatch.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/eligibility/results", "/login", "/signup"] }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
