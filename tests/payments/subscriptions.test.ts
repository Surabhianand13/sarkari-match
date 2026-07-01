import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { planCodeForRazorpayPlan, shouldGrantSubscriptionEntitlement, verifyWebhookSignature } from "@/lib/payments/subscriptions";

describe("regular subscriptions", () => {
  it("maps Razorpay plan IDs to plan codes", () => {
    expect(planCodeForRazorpayPlan("plan_pro_m", { RAZORPAY_PLAN_PRO_MONTHLY: "plan_pro_m" })).toBe("pro_monthly");
  });

  it("verifies webhook signatures", () => {
    const body = JSON.stringify({ event: "subscription.activated" });
    const signature = crypto.createHmac("sha256", "secret").update(body).digest("hex");
    expect(verifyWebhookSignature({ body, signature, secret: "secret" })).toBe(true);
  });

  it("only grants entitlements for authoritative subscription events", () => {
    expect(shouldGrantSubscriptionEntitlement("subscription.activated")).toBe(true);
    expect(shouldGrantSubscriptionEntitlement("payment.failed")).toBe(false);
  });
});
