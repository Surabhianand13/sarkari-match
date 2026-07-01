import { describe, expect, it } from "vitest";
import { publishAllowedForExtraction, validateExtractionPayload } from "@/lib/extraction/review";

describe("extraction review", () => {
  it("blocks publish without human verification", () => {
    expect(publishAllowedForExtraction("approved", false)).toBe(false);
    expect(publishAllowedForExtraction("approved", true)).toBe(true);
  });

  it("validates extraction payloads", () => {
    const parsed = validateExtractionPayload({
      sourceUrl: "https://example.com/notice.pdf",
      organisationName: "Demo Org",
      recruitmentTitle: "Demo Recruitment",
      posts: [{ title: "Demo Post", qualificationText: "Graduate" }]
    });
    expect(parsed.success).toBe(true);
  });
});
