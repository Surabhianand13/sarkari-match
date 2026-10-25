import { describe, expect, it } from "vitest";
import { homeFaq } from "@/lib/faq";
import { hubDescription, jobsForState } from "@/lib/data/hubs";
import { demoJobs } from "@/lib/data/catalog";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

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

  it("links the website and organization entities and brands them by PW", () => {
    expect(organizationJsonLd().name).toContain("by PW");
    expect(websiteJsonLd().publisher["@id"]).toBe(organizationJsonLd()["@id"]);
  });

  it("describes hubs with their notification count and groups jobs by state", () => {
    expect(hubDescription("state", "Karnataka", 3)).toContain("3 verified");
    expect(jobsForState(demoJobs, "karnataka").every((job) => job.state === "Karnataka")).toBe(true);
  });
});
