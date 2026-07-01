import crypto from "node:crypto";
import type { PlanCode } from "@/lib/entitlements/plans";

export const subscriptionPlanCodes = ["pro_monthly", "pro_annual", "pro_plus_monthly", "pro_plus_annual"] as const;
export type SubscriptionPlanCode = (typeof subscriptionPlanCodes)[number];

export type RazorpaySubscriptionEvent =
  | "subscription.activated"
  | "subscription.charged"
  | "subscription.pending"
  | "subscription.halted"
  | "subscription.cancelled"
  | "subscription.completed"
  | "payment.authorized"
  | "payment.captured"
  | "payment.failed"
  | "order.paid";

export function verifyWebhookSignature({ body, signature, secret }: { body: string; signature: string; secret: string }) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function planCodeForRazorpayPlan(planId: string, env: Partial<NodeJS.ProcessEnv> = process.env): PlanCode | null {
  const map: Record<string, PlanCode> = {
    [env.RAZORPAY_PLAN_PRO_MONTHLY ?? ""]: "pro_monthly",
    [env.RAZORPAY_PLAN_PRO_ANNUAL ?? ""]: "pro_annual",
    [env.RAZORPAY_PLAN_PRO_PLUS_MONTHLY ?? ""]: "pro_plus_monthly",
    [env.RAZORPAY_PLAN_PRO_PLUS_ANNUAL ?? ""]: "pro_plus_annual"
  };
  return map[planId] ?? null;
}

export function shouldGrantSubscriptionEntitlement(event: RazorpaySubscriptionEvent) {
  return event === "subscription.activated" || event === "subscription.charged";
}
