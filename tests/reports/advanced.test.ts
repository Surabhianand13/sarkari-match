import { describe, expect, it } from "vitest";
import { advancedReportAccess, buildAdvancedEligibilityReport } from "@/lib/reports/advanced";

describe("advanced reports", () => {
  it("requires Pro Plus flag and entitlement", () => {
    expect(advancedReportAccess(true, true)).toBe(true);
    expect(advancedReportAccess(true, false)).toBe(false);
  });

  it("builds a report summary", () => {
    const report = buildAdvancedEligibilityReport({ profile: { id: "p1", displayName: "Primary", completion: 80 }, results: [], proPlusEnabled: true });
    expect(report.headline).toContain("Primary");
  });
});
