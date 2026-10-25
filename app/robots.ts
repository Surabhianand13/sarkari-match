import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/brand";

const privatePaths = ["/admin", "/dashboard", "/api", "/eligibility/results", "/login", "/signup", "/checkout", "/auth"];

// Search and AI crawlers are explicitly welcome on public pages; the same private paths stay blocked for all.
const welcomedBots = ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot", "Applebot-Extended", "DuckDuckBot"];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      { userAgent: welcomedBots, allow: "/", disallow: privatePaths },
      { userAgent: "*", allow: "/", disallow: privatePaths }
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl
  };
}
