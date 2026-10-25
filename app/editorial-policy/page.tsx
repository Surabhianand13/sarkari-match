import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'Editorial Policy', description: 'How Sarkari Match by PW verifies govt job and exam notifications against official sources before publishing.', path: '/editorial-policy' });

export default function Page() {
  return <LegalPage title="Editorial Policy" body="Govt job and exam notification information must be reviewed against official sources before publication. AI-extracted data cannot be published without human review." />;
}
