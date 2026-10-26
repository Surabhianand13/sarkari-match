import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'About Sarkari Match', description: 'Sarkari Match is an independent platform that matches govt job and exam notifications to your eligibility using published rules, with official links only.', path: '/about' });

export default function Page() {
  return <LegalPage title="About SarkariMatch" body="SarkariMatch is an independent information platform for verified govt job and exam notifications with rule-based eligibility matching." />;
}
