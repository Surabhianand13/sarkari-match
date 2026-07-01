import { requireAdmin } from "@/lib/auth/guards";
import { recruitmentCsvTemplate } from "@/lib/import/csv";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminImportPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-primary">CSV import</h1>
      <p className="mt-3 text-muted">Validate rows, preview errors and import only into draft or needs-review status. Imported rows must never publish automatically.</p>
      <section className="mt-6 rounded-3xl bg-white p-5 shadow-soft">
        <h2 className="text-xl font-black text-primary">Template</h2>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-surface p-4 text-sm">{recruitmentCsvTemplate}</pre>
      </section>
    </div>
  );
}
