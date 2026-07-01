import { FileDown } from "lucide-react";
import { ButtonLink, SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";
import { advancedReportAccess, buildAdvancedEligibilityReport } from "@/lib/reports/advanced";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdvancedReportsPage() {
  await requireUser();
  const enabled = process.env.NEXT_PUBLIC_ENABLE_PRO_PLUS === "true";
  const report = buildAdvancedEligibilityReport({
    profile: { id: "self", displayName: "Primary profile", completion: 75 },
    results: [],
    proPlusEnabled: enabled
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SectionHeading eyebrow="Advanced reports" title="Detailed eligibility reports" body="Pro Plus adds downloadable reports with profile gaps, rule warnings and next-step recommendations." />
      <section className="rounded-[2rem] bg-white p-5 shadow-soft">
        <FileDown className="text-brand-green" size={28} aria-hidden="true" />
        <h2 className="mt-3 text-2xl font-black text-primary">{report.headline}</h2>
        <ul className="mt-4 space-y-2 text-sm font-bold text-muted">
          {report.recommendations.map((item) => <li key={item}>- {item}</li>)}
        </ul>
        <ButtonLink href="/pricing" className="mt-5" variant={advancedReportAccess(report.exportable, enabled) ? "primary" : "secondary"}>
          {advancedReportAccess(report.exportable, enabled) ? "Download report" : "Pro Plus required"}
        </ButtonLink>
      </section>
    </div>
  );
}
