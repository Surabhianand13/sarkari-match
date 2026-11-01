import { afterEach, describe, expect, it, vi } from "vitest";
import { homeFaq } from "@/lib/faq";
import { hubDescription, jobsForState } from "@/lib/data/hubs";
import { demoJobs } from "@/lib/data/catalog";
import { indexNowKey, indexNowPayload, notifyIndexNow } from "@/lib/indexnow";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, isStaleClosedJob, latestDate, organizationJsonLd, sitemapDate, websiteJsonLd } from "@/lib/seo";

describe("seo helpers", () => {
  it("builds canonical, open graph and robots metadata", () => {
    const meta = buildMetadata({ title: "Pricing", description: "Plans", path: "/pricing" });
    expect(meta.alternates?.canonical).toMatch(/\/pricing$/);
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(buildMetadata({ title: "x", description: "y", path: "/x", noindex: true }).robots).toEqual({ index: false, follow: true });
  });

  it("numbers breadcrumb positions from one with absolute urls", () => {
    const data = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Jobs", path: "/jobs" }]);
    expect(data.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(data.itemListElement[1].item).toMatch(/^https?:\/\/.+\/jobs$/);
  });

  it("emits one FAQ entry per question with a non-empty answer", () => {
    const data = faqJsonLd(homeFaq);
    expect(data.mainEntity).toHaveLength(homeFaq.length);
    expect(data.mainEntity.every((entry) => entry.acceptedAnswer.text.length > 40)).toBe(true);
  });

  it("links the website and organization entities and names the brand", () => {
    expect(organizationJsonLd().name).toBe("Sarkari Match");
    expect(websiteJsonLd().publisher["@id"]).toBe(organizationJsonLd()["@id"]);
  });

  it("describes hubs with their notification count and groups jobs by state", () => {
    expect(hubDescription("state", "Karnataka", 3)).toContain("3 verified");
    expect(jobsForState(demoJobs, "karnataka").every((job) => job.state === "Karnataka")).toBe(true);
  });
});

describe("indexing helpers", () => {
  it("leaves out sitemap dates that are missing or invalid instead of using now", () => {
    expect(sitemapDate(undefined)).toBeUndefined();
    expect(sitemapDate("")).toBeUndefined();
    expect(sitemapDate("not a date")).toBeUndefined();
    expect(sitemapDate("2026-10-01T00:00:00Z")?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("picks the newest valid date", () => {
    expect(latestDate(["2026-01-01", "garbage", "2026-03-01", undefined])?.toISOString()).toBe(new Date("2026-03-01").toISOString());
    expect(latestDate([undefined, ""])).toBeUndefined();
  });

  it("stops submitting a closed notification only after the grace period", () => {
    const now = new Date("2026-11-02T00:00:00Z");
    expect(isStaleClosedJob({ applicationStatus: "closed", applicationEndDate: "2026-10-20" }, now)).toBe(false);
    expect(isStaleClosedJob({ applicationStatus: "closed", applicationEndDate: "2026-09-01" }, now)).toBe(true);
    expect(isStaleClosedJob({ applicationStatus: "open", applicationEndDate: "2026-09-01" }, now)).toBe(false);
    expect(isStaleClosedJob({ applicationStatus: "closed", applicationEndDate: "" }, now)).toBe(false);
  });
});

describe("indexnow", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("only accepts a well formed key", () => {
    vi.stubEnv("INDEXNOW_KEY", "");
    expect(indexNowKey()).toBeNull();
    vi.stubEnv("INDEXNOW_KEY", "short");
    expect(indexNowKey()).toBeNull();
    vi.stubEnv("INDEXNOW_KEY", "3f2a9c1e-7b64-4d0e-9a55-1c2b8e6f4a10");
    expect(indexNowKey()).toBe("3f2a9c1e-7b64-4d0e-9a55-1c2b8e6f4a10");
  });

  it("builds an absolute, de-duplicated url list pointing at the key file", () => {
    const payload = indexNowPayload(["/jobs/a", "/jobs/a", "/blog"], "3f2a9c1e-7b64-4d0e-9a55-1c2b8e6f4a10", "https://sarkarimatch.com");
    expect(payload.host).toBe("sarkarimatch.com");
    expect(payload.keyLocation).toBe("https://sarkarimatch.com/indexnow-key.txt");
    expect(payload.urlList).toHaveLength(2);
    expect(payload.urlList.every((url) => url.startsWith("https://"))).toBe(true);
  });

  it("does not call out without a key", () => {
    vi.stubEnv("INDEXNOW_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    notifyIndexNow(["/jobs/a"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
