import { AdminHeader, ButtonLinkSmall, Card, DataTable, Flash, StatusPill, Td } from "@/components/admin/ui";
import { OrganisationForm } from "@/components/admin/organisation-form";
import { adminDb } from "@/lib/admin/db";
import { listDepartments, listStates } from "@/lib/admin/lookups";

export const metadata = { title: "Organisations" };

export default async function AdminOrganisationsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const [orgs, departments, states] = await Promise.all([
    db.query<{ id: string; name: string; organisation_type: string | null; active: boolean; department: string | null; state: string | null; recruitments: string }>(
      `select o.id, o.name, o.organisation_type, o.active, d.name as department, s.name as state,
              (select count(*) from recruitments r where r.organisation_id = o.id) as recruitments
       from organisations o left join departments d on d.id = o.department_id left join states s on s.id = o.state_id order by o.name`
    ),
    listDepartments(),
    listStates()
  ]);

  return (
    <div className="grid gap-6">
      <AdminHeader title="Organisations" description="Create the recruiting organisations first, then attach recruitments and posts to them." />
      <Flash notice={notice} error={error} />
      <Card title="Add organisation"><OrganisationForm departments={departments} states={states} /></Card>
      <DataTable headers={["Name", "Type", "Department", "State", "Recruitments", "Status", ""]} empty="No organisations yet.">
        {orgs.rows.map((org) => (
          <tr key={org.id}>
            <Td className="font-black text-primary">{org.name}</Td>
            <Td>{org.organisation_type?.replaceAll("_", " ") ?? "-"}</Td>
            <Td>{org.department ?? "-"}</Td>
            <Td>{org.state ?? "-"}</Td>
            <Td>{org.recruitments}</Td>
            <Td><StatusPill status={org.active ? "published" : "archived"} /></Td>
            <Td><ButtonLinkSmall href={`/admin/organisations/${org.id}`}>Edit</ButtonLinkSmall></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
