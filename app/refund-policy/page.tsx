import { LegalPage } from "@/components/legal-page";
import { LEGAL_UPDATED, business } from "@/lib/business";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Refund and Cancellation Policy", description: "Refund and cancellation policy for Sarkari Match Exam Passes and the AI Study Guide.", path: "/refund-policy" });

export default function Page() {
  return (
    <LegalPage
      title="Refund and Cancellation Policy"
      updated={LEGAL_UPDATED}
      sections={[
        { heading: "What you are buying", body: ["Sarkari Match sells digital products: an Exam Pass (mock tests, solutions, analysis, adaptive practice and a study plan for one exam) and an AI Study Guide (an AI tutor for one exam). Each is a one-time payment for the validity shown at checkout, usually 12 months. There is no subscription and no auto-renewal, so there is nothing to cancel."] },
        { heading: "No refunds once access is granted", body: ["Access is added to your account as soon as your payment succeeds, and the content is available immediately. Because of this, we do not offer refunds after access has been granted.", "You can try before you buy: every exam has a free sample test, and the exam and job matcher and daily practice are free."] },
        { heading: "When we will refund you", body: ["We will refund you in full in these cases:"], bullets: [
          "You were charged but access was not added to your account within 24 hours, and we could not fix it.",
          "You paid twice for the same product.",
          "The amount charged is different from the amount shown at checkout.",
          "A refund is required by law."
        ] },
        { heading: "How to ask", body: [`Email ${business.supportEmail} within 7 days of the payment with the email you signed up with, the payment reference and a short description. We will reply within 3 working days. Approved refunds go back to the original payment method and usually reach you within 7 working days.`] },
        { heading: "Price changes", body: ["If we change a price later, products you have already bought are not affected, and you are not owed the difference."] },
        { heading: "When your access ends", body: ["Access ends when the validity period you bought ends. To continue, buy the product again. We will not charge you automatically."] }
      ]}
    />
  );
}
