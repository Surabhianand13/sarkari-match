import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'How Eligibility Matching Works', description: 'How Sarkari Match checks your age, qualification, category and domicile against post-level notification rules, without using AI for eligibility decisions.', path: '/how-it-works' });

export default function Page() {
  return <LegalPage title="How It Works" body="Create a profile, run deterministic matching against verified rules, then apply through official organisation links." />;
}
