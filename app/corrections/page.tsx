import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'Corrections Policy', description: 'How to report and how Sarkari Match by PW handles corrections to notification details.', path: '/corrections' });

export default function Page() {
  return <LegalPage title="Corrections Policy" body="Users can report incorrect dates, links, eligibility rules or duplicate posts. Editors review reports and record changes in audit history." />;
}
