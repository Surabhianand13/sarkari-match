import { LegalPage } from "@/components/legal-page";
import { LEGAL_UPDATED, business, contactLines } from "@/lib/business";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Privacy Policy", description: "How Sarkari Match collects, uses and protects your data, including eligibility profiles, test results and AI chat.", path: "/privacy" });

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={LEGAL_UPDATED}
      sections={[
        { heading: "Who we are", body: [`${business.name} runs Sarkari Match. This policy explains what personal data we collect, why, who we share it with, how long we keep it and your choices. We follow India's Digital Personal Data Protection Act, 2023.`] },
        { heading: "What we collect", bullets: [
          "Account details: your name, email, phone number if you give one, and a securely hashed password.",
          "Eligibility profile, if you use the matcher: date of birth, category, gender, qualifications, domicile state and preferences. You choose what to enter.",
          "Learning activity: tests you attempt, answers, scores, practice sessions, progress and study plans.",
          "AI chat: the messages you send to the AI Study Guide and the support assistant, and the replies.",
          "Purchases: which Exam Pass or AI Study Guide you bought and the payment reference. Card, UPI and bank details are handled by our payment provider and are never stored by us.",
          "Technical data: your IP address, device and browser details, and cookies needed to keep you signed in and remember your language."
        ] },
        { heading: "Why we use it", bullets: [
          "To run your account, give you access to what you bought, and score your tests.",
          "To match notifications to your eligibility and build your study plan from your own results.",
          "To answer your questions with the AI features, using your results for this exam.",
          "To keep the service safe, prevent abuse and fix problems.",
          "To send service emails such as sign-in codes. We do not sell your data."
        ] },
        { heading: "Who we share it with", body: ["We use trusted service providers to run Sarkari Match. They process data only to provide their service to us:"], bullets: [
          "Hosting and database providers, and a network and security provider.",
          "An email provider, for service emails.",
          "An AI provider, which receives your AI chat messages and a short summary of your results for that exam so it can answer. We do not authorise it to use this data to train its models.",
          "A payment provider, which handles your payment.",
          "Analytics tools, only if enabled, to understand how the site is used."
        ] },
        { heading: "What other visitors can see", body: ["To show that real learners are using the platform, we may show a small pop-up such as \"Rahul from Delhi enrolled in SSC CGL, 2 hours ago\". It shows only your first name, your state if you gave one, the product and the time. If you do not want your first name shown, email us and we will stop it. Your test results, profile and chats are never public."] },
        { heading: "Cookies", body: ["We use cookies that are needed to keep you signed in and remember your language. Optional analytics cookies are used only if switched on. You can clear cookies in your browser at any time."] },
        { heading: "How long we keep data", body: ["We keep your account and learning data while your account is active. AI chat history is kept so the conversation continues, and is deleted when you ask or when your account is deleted. We may keep purchase records for as long as the law requires."] },
        { heading: "How we protect it", body: ["Passwords are hashed, connections are encrypted, and admin access is restricted. No system is perfectly secure, but we take care and will tell you and the authorities if a breach affects you, as the law requires."] },
        { heading: "Your rights", body: ["You can ask us to show you the data we hold about you, correct it, delete your account and data, or withdraw consent where we rely on it. You can also complain to us first and, if you are not satisfied, to the Data Protection Board of India. To make a request, write to us using the details below."] },
        { heading: "Age", body: ["Sarkari Match is for people aged 18 or over. If we learn that a child's data was given to us, we will delete it."] },
        { heading: "Changes to this policy", body: ["If we change this policy in a way that matters, we will update the date above and tell you on the site or by email."] },
        { heading: "Contact and grievances", body: [...contactLines(), business.grievanceOfficer ? `Grievance officer: ${business.grievanceOfficer}` : "For any privacy request or complaint, write to the email above and we will reply within 7 days."] }
      ]}
    />
  );
}
