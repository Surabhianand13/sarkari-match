import { describe, expect, it } from "vitest";
import { canAttributeReferral, createReferralCode, rewardsForPaidReferralCount } from "@/lib/referrals/rules";

describe("referrals", () => {
  it("creates stable referral codes", () => {
    expect(createReferralCode("user_1")).toBe(createReferralCode("user_1"));
  });

  it("blocks self referral and duplicate identity", () => {
    expect(canAttributeReferral({ referrerUserId: "u1", referredUserId: "u1" })).toBe(false);
    expect(canAttributeReferral({ referrerUserId: "u1", referredUserId: "u2", duplicateIdentity: true })).toBe(false);
  });

  it("grants configured reward thresholds", () => {
    expect(rewardsForPaidReferralCount(3)).toContain("one_month_pro_extension");
    expect(rewardsForPaidReferralCount(10)).toContain("one_year_pro_extension");
  });
});
