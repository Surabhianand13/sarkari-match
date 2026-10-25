import { LegalPage } from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: 'Refund Policy', description: 'Refund policy for Sarkari Match by PW paid plans and the Founding Pass.', path: '/refund-policy' });

export default function Page() {
  return <LegalPage title="Refund and Cancellation Policy" body="Founding Pass refund behavior and recurring subscription cancellation policies are configurable by administrators and must be published before payments go live." />;
}
