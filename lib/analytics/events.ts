export type AnalyticsEvent =
  | "mobile_homepage_viewed"
  | "homepage_search"
  | "qualification_selected"
  | "eligibility_flow_started"
  | "eligibility_step_completed"
  | "eligibility_form_abandoned"
  | "matches_viewed"
  | "job_opened"
  | "official_apply_clicked"
  | "founding_checkout_started"
  | "payment_completed"
  | "payment_failed";

export function trackEvent(event: AnalyticsEvent, properties: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("sarkarimatch:analytics", { detail: { event, properties } }));
}
