import { describe, expect, it } from "vitest";
import { hasFeature, numericEntitlement } from "@/lib/entitlements/plans";

describe("entitlements", () => {
  it("limits free saved notifications", () => {
    expect(numericEntitlement("free", "saved_jobs_limit")).toBe(3);
  });

  it("grants founding pro explanations", () => {
    expect(hasFeature("founding_pro_3y", "full_match_explanation")).toBe(true);
  });
});
