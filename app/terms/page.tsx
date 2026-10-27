import { LegalPage } from "@/components/legal-page";
import { LEGAL_UPDATED, business } from "@/lib/business";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Terms of Use", description: "Terms of use for Sarkari Match: accounts, purchases, content licence, AI features and eligibility guidance.", path: "/terms" });

export default function Page() {
  return (
    <LegalPage
      title="Terms of Use"
      updated={LEGAL_UPDATED}
      sections={[
        { heading: "About these terms", body: [`These terms apply when you use the Sarkari Match website and services, run by ${business.name}. By creating an account, buying a product or using the site you agree to them. If you do not agree, please do not use the service.`] },
        { heading: "Who can use it", body: ["Sarkari Match is for people aged 18 or over. You must give accurate details and keep your password safe. You are responsible for what happens under your account."] },
        { heading: "Independent service, not a government site", body: ["Sarkari Match is an independent platform. It is not connected with the Government of India, any state government, SSC, UPSC or any other recruiting body.", "Notifications and eligibility results are informational guidance based on published rules. They are not a guarantee of eligibility, selection or appointment. Always read the official notification and apply only through the official website. We never charge for job applications."] },
        { heading: "What you buy", body: ["An Exam Pass gives you access to the tests and features of one exam for the validity shown at checkout. The AI Study Guide gives you access to an AI tutor for one exam for the validity shown at checkout, within the daily usage limits. Both are one-time payments with no auto-renewal. Access is for you only. See the Refund and Cancellation Policy for refunds."] },
        { heading: "Our content and your licence", body: ["The questions, solutions, analysis, study plans and other content are owned by us or our licensors. You get a personal, non-transferable licence to use them for your own preparation."], bullets: [
          "Do not copy, share, resell, publish or distribute the questions or solutions, including screenshots and recordings.",
          "Do not share your account or access with others.",
          "Do not scrape the site, use bots, or try to get answers or content in bulk.",
          "Do not try to break, overload or gain unauthorised access to the service."
        ] },
        { heading: "AI features", body: ["Some features use artificial intelligence, such as the AI Study Guide and the support assistant. AI can be wrong or out of date. Check important facts, dates and rules with the official source. AI answers are study help, not professional, legal or financial advice. Your messages to AI features are processed by our AI provider to produce the answer, as described in the Privacy Policy. We may limit daily use to keep the service fair."] },
        { heading: "Availability and changes", body: ["We work to keep the service running but cannot promise it will always be available or error-free. We may change or remove features, exams and content, and update these terms. If a change materially affects something you bought, we will tell you."] },
        { heading: "Ending your access", body: ["You can stop using the service at any time. We may suspend or end access if you break these terms, for example by sharing content or your account. In that case no refund is due."] },
        { heading: "Limits of our responsibility", body: ["The service is provided as it is. To the extent the law allows, we are not responsible for indirect or consequential loss, or for results in any exam or recruitment. Our total responsibility to you for any claim is limited to the amount you paid for the product concerned. Nothing here limits rights you have under law that cannot be limited."] },
        { heading: "Governing law", body: ["These terms are governed by the laws of India."] },
        { heading: "Contact", body: [`Questions about these terms: ${business.supportEmail}.`] }
      ]}
    />
  );
}
