export type FeatureKey =
  | "basic_matching"
  | "unlimited_matching"
  | "full_match_explanation"
  | "saved_jobs_limit"
  | "application_tracker_limit"
  | "daily_email_alerts"
  | "whatsapp_alerts"
  | "candidate_profile_limit"
  | "calendar"
  | "downloadable_report"
  | "compare_jobs"
  | "ad_free";

export type PlanCode = "free" | "founding_pro_3m" | "pro_monthly" | "pro_annual" | "pro_plus_monthly" | "pro_plus_annual";

export const planFeatures: Record<PlanCode, Partial<Record<FeatureKey, boolean | number>>> = {
  free: { basic_matching: true, saved_jobs_limit: 3, application_tracker_limit: 3, candidate_profile_limit: 1 },
  founding_pro_3m: { basic_matching: true, unlimited_matching: true, full_match_explanation: true, saved_jobs_limit: Infinity, application_tracker_limit: Infinity, daily_email_alerts: true, calendar: true, compare_jobs: true, ad_free: true, candidate_profile_limit: 1 },
  pro_monthly: { basic_matching: true, unlimited_matching: true, full_match_explanation: true, saved_jobs_limit: Infinity, application_tracker_limit: Infinity, daily_email_alerts: true, calendar: true, compare_jobs: true, ad_free: true, candidate_profile_limit: 1 },
  pro_annual: { basic_matching: true, unlimited_matching: true, full_match_explanation: true, saved_jobs_limit: Infinity, application_tracker_limit: Infinity, daily_email_alerts: true, calendar: true, compare_jobs: true, ad_free: true, candidate_profile_limit: 1 },
  pro_plus_monthly: { basic_matching: true, unlimited_matching: true, full_match_explanation: true, saved_jobs_limit: Infinity, application_tracker_limit: Infinity, daily_email_alerts: true, whatsapp_alerts: true, calendar: true, downloadable_report: true, compare_jobs: true, ad_free: true, candidate_profile_limit: 3 },
  pro_plus_annual: { basic_matching: true, unlimited_matching: true, full_match_explanation: true, saved_jobs_limit: Infinity, application_tracker_limit: Infinity, daily_email_alerts: true, whatsapp_alerts: true, calendar: true, downloadable_report: true, compare_jobs: true, ad_free: true, candidate_profile_limit: 3 }
};

export const pricingPlans = [
  { code: "free", name: "Free", priceLabel: "₹0", description: "Browse notifications and run basic matching.", features: ["One candidate profile", "Basic eligibility matching", "Save up to 3 notifications"] },
  { code: "founding_pro_3m", name: "Founding Pro Pass", priceLabel: "₹49 one-time", description: "Get 3 months of SarkariMatch Pro for ₹49.", features: ["Limited to first 1,000 Founding Members", "No automatic renewal", "Full match explanations"] },
  { code: "pro_monthly", name: "Pro", priceLabel: "₹99/month", description: "Unlimited matches and reminders.", features: ["Unlimited saved notifications", "Daily digest", "Ad-free logged-in experience"] },
  { code: "pro_plus_monthly", name: "Pro Plus", priceLabel: "₹199/month", description: "Coming Soon when disabled by feature flag.", features: ["Up to 3 profiles", "Advanced reminders", "WhatsApp alerts when configured"] }
] as const;

export function hasFeature(plan: PlanCode, feature: FeatureKey) {
  return Boolean(planFeatures[plan][feature]);
}

export function numericEntitlement(plan: PlanCode, feature: FeatureKey) {
  const value = planFeatures[plan][feature];
  return typeof value === "number" ? value : value ? Infinity : 0;
}
