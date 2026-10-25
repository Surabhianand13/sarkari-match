import { AdminHeader, ButtonLinkSmall, DataTable, Flash, StatusPill, Td } from "@/components/admin/ui";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Posts" };

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const { rows } = await db.query<{ id: string; title: string; recruitment: string; vacancy_count: number | null; application_status: string; live: boolean; end_date: string | null }>(
    `select jp.id, jp.title, r.title as recruitment, jp.vacancy_count, jp.application_status::text as application_status,
            (jp.active and jp.published_at is not null and r.editorial_status = 'published') as live, r.application_end_date::text as end_date
     from job_posts jp join recruitments r on r.id = jp.recruitment_id order by jp.updated_at desc limit 300`
  );
  return (
    <div className="grid gap-4">
      <AdminHeader title="Notification posts" description="Each post is one public notification page with its own eligibility rules." action={{ href: "/admin/posts/new", label: "New post" }} />
      <Flash notice={notice} error={error} />
      <DataTable headers={["Post", "Recruitment", "Vacancies", "Application", "Last date", "Live", ""]} empty="No posts yet. Create an organisation and a recruitment first.">
        {rows.map((row) => (
          <tr key={row.id}>
            <Td className="font-black text-primary">{row.title}</Td>
            <Td>{row.recruitment}</Td>
            <Td>{row.vacancy_count ?? "-"}</Td>
            <Td>{row.application_status}</Td>
            <Td>{row.end_date ?? "-"}</Td>
            <Td><StatusPill status={row.live ? "published" : "draft"} /></Td>
            <Td><ButtonLinkSmall href={`/admin/posts/${row.id}`}>Edit</ButtonLinkSmall></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
