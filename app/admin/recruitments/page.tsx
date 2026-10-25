import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, ButtonLinkSmall, DataTable, Flash, StatusPill, Td } from "@/components/admin/ui";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Recruitments" };

const filters = ["all", "draft", "needs_review", "reviewed", "published", "expired", "archived"];

export default async function AdminRecruitmentsPage({ searchParams }: { searchParams: Promise<{ status?: string; notice?: string; error?: string }> }) {
  const { status = "all", notice, error } = await searchParams;
  const db = await adminDb();
  const where = filters.includes(status) && status !== "all" ? "where r.editorial_status = $1" : "";
  const { rows } = await db.query<{ id: string; title: string; organisation: string; application_end_date: string | null; editorial_status: string; posts: string }>(
    `select r.id, r.title, o.name as organisation, r.application_end_date::text, r.editorial_status,
            (select count(*) from job_posts jp where jp.recruitment_id = r.id) as posts
     from recruitments r join organisations o on o.id = r.organisation_id ${where} order by r.updated_at desc limit 200`,
    where ? [status] : []
  );
  return (
    <div className="grid gap-4">
      <AdminHeader title="Recruitments" description="Draft, review and publish recruitments. Posts attach to a recruitment." action={{ href: "/admin/recruitments/new", label: "New recruitment" }} />
      <Flash notice={notice} error={error} />
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link key={filter} href={`/admin/recruitments?status=${filter}` as Route} className={`rounded-full px-3 py-1.5 text-xs font-black ${status === filter ? "bg-primary text-white" : "bg-white text-primary shadow-soft"}`}>
            {filter.replace("_", " ")}
          </Link>
        ))}
      </div>
      <DataTable headers={["Recruitment", "Organisation", "Last date", "Posts", "Status", ""]} empty="No recruitments match this filter.">
        {rows.map((row) => (
          <tr key={row.id}>
            <Td className="font-black text-primary">{row.title}</Td>
            <Td>{row.organisation}</Td>
            <Td>{row.application_end_date ?? "-"}</Td>
            <Td>{row.posts}</Td>
            <Td><StatusPill status={row.editorial_status} /></Td>
            <Td><ButtonLinkSmall href={`/admin/recruitments/${row.id}`}>Open</ButtonLinkSmall></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
