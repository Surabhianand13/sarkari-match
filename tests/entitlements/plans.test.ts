import { describe, expect, it } from "vitest";
import { hasFeature, numericEntitlement } from "@/lib/entitlements/plans";

describe("entitlements", () => {
  it("keeps the exam and job matcher free, including the full explanation", () => {
    expect(hasFeature("free", "basic_matching")).toBe(true);
    expect(hasFeature("free", "unlimited_matching")).toBe(true);
    expect(hasFeature("free", "full_match_explanation")).toBe(true);
  });

  it("gives free accounts a generous saved notifications limit", () => {
    expect(numericEntitlement("free", "saved_jobs_limit")).toBe(50);
  });
});
