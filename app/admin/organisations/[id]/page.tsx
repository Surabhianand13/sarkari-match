import { notFound } from "next/navigation";
import { AdminHeader, Card, Flash } from "@/components/admin/ui";
import { OrganisationForm } from "@/components/admin/organisation-form";
import { adminDb } from "@/lib/admin/db";
import { listDepartments, listStates } from "@/lib/admin/lookups";

export const metadata = { title: "Edit organisation" };

export default async function EditOrganisationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await adminDb();
  const { rows } = await db.query("select * from organisations where id = $1", [id]);
  if (!rows[0]) notFound();
  const [departments, states] = await Promise.all([listDepartments(), listStates()]);
  return (
    <div className="grid gap-6">
      <AdminHeader title="Edit organisation" />
      <Flash error={error} />
      <Card><OrganisationForm values={rows[0] as never} departments={departments} states={states} /></Card>
    </div>
  );
}
