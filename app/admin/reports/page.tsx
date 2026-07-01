import { requireAdmin } from "@/lib/auth/guards";
import { demoJobs } from "@/lib/data/catalog";
import { summarizeAdminReports } from "@/lib/reports/admin";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminReportsPage() {
  await requireAdmin();
  const summary = summarizeAdminReports({ jobs: demoJobs, reportedErrors: 0, savedJobs: 0, trackedApplications: 0 });
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-primary">Reports dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(summary).map(([key, value]) => (
          <section key={key} className="rounded-3xl bg-white p-5 shadow-soft">
            <p className="text-3xl font-black text-primary">{value}</p>
            <p className="mt-1 text-sm font-bold capitalize text-muted">{key.replace(/([A-Z])/g, " $1")}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
