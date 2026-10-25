import { AdminHeader, Card, Field, Flash, SubmitButton, inputClass } from "@/components/admin/ui";
import { importCsv } from "@/app/admin/import/actions";
import { recruitmentCsvTemplate } from "@/lib/import/csv";

export const metadata = { title: "CSV import" };

export default async function AdminImportPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  return (
    <div className="grid gap-4">
      <AdminHeader title="CSV import" description="Bulk-create draft notifications. Imported rows are never published automatically; review and publish them one by one." />
      <Flash notice={notice} error={error} />
      <Card title="Template">
        <p className="mb-2 text-sm text-muted">First line of the file (dates as YYYY-MM-DD, links starting with https):</p>
        <pre className="overflow-x-auto rounded-xl bg-surface p-3 text-xs text-primary">{recruitmentCsvTemplate}</pre>
      </Card>
      <Card title="Upload">
        <form action={importCsv} className="grid gap-4">
          <Field label="CSV file"><input type="file" name="csv" accept=".csv,text/csv" required className={inputClass} /></Field>
          <label className="flex items-center gap-2 text-sm font-black text-primary"><input type="checkbox" name="dry_run" defaultChecked className="size-4" /> Check only, do not create anything</label>
          <div><SubmitButton>Run</SubmitButton></div>
        </form>
      </Card>
    </div>
  );
}
