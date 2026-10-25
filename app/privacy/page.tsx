import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'Privacy Policy', description: 'How Sarkari Match by PW collects, uses and protects candidate profile data.', path: '/privacy' });

export default function Page() {
  return <LegalPage title="Privacy Policy" body="SarkariMatch stores only necessary profile and billing data. Private eligibility results are not indexed and are not exposed through public URLs." />;
}
