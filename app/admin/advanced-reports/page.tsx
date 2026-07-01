import { BarChart3 } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { getJobs } from "@/lib/data/jobs";
import { summarizeAdminReports } from "@/lib/reports/admin";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdvancedAdminReportsPage() {
  await requireAdmin();
  const jobs = await getJobs();
  const summary = summarizeAdminReports({ jobs });
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-primary">Advanced reports</h1>
      <p className="mt-3 text-muted">P2 prepares operational reporting across notifications, reports, subscriptions, alerts and extraction queues.</p>
      <div className="mt-6 rounded-[2rem] bg-white p-5 shadow-soft">
        <BarChart3 className="text-brand-green" size={28} aria-hidden="true" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Active notifications" value={summary.activeJobs} />
          <Metric label="Closing in 7 days" value={summary.closingInSevenDays} />
          <Metric label="Reported errors" value={summary.reportedErrors} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-3xl font-black text-primary">{value}</p>
      <p className="text-sm font-bold text-muted">{label}</p>
    </div>
  );
}
