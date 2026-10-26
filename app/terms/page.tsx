import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'Terms of Service', description: 'Terms of service for using Sarkari Match.', path: '/terms' });

export default function Page() {
  return <LegalPage title="Terms of Use" body="Eligibility guidance is informational and does not guarantee eligibility, selection or appointment. Always verify the official notification." />;
}
