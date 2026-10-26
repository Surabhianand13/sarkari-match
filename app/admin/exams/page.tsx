import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, DataTable, Flash, StatusPill, Td } from "@/components/admin/ui";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Exams and offers" };

export default async function AdminExamsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const rows = await db.query<{ id: string; slug: string; name: string; active: boolean; series: string; min_price: number | null; guide_enabled: boolean | null; guide_price_paise: number | null }>(
    `select e.id, e.slug, e.name, e.active, (select count(*) from test_series s where s.exam_id = e.id) as series,
            (select min(price_paise) from test_series s where s.exam_id = e.id and s.price_paise > 0) as min_price, o.guide_enabled, o.guide_price_paise
       from exams e left join exam_offers o on o.exam_id = e.id order by e.name`
  );
  const rupees = (paise: number | null) => (paise === null ? "-" : `₹${(paise / 100).toLocaleString("en-IN")}`);
  return (
    <div>
      <AdminHeader title="Exams and offers" description="Each exam has its own Pass price (set on its test series), AI Study Guide price, validity, discount and AI limits." action={{ href: "/admin/exams/new", label: "+ New exam" }} />
      <Flash notice={notice} error={error} />
      <DataTable headers={["Exam", "Status", "Series", "Pass from", "AI Study Guide", ""]} empty="No exams yet.">
        {rows.rows.map((exam) => (
          <tr key={exam.id}>
            <Td><span className="font-black text-primary">{exam.name}</span><p className="text-xs text-muted">/{exam.slug}</p></Td>
            <Td><StatusPill status={exam.active ? "published" : "draft"} /></Td>
            <Td>{exam.series}</Td>
            <Td>{rupees(exam.min_price)}</Td>
            <Td>{exam.guide_enabled ? rupees(exam.guide_price_paise) : "Off"}</Td>
            <Td><Link href={`/admin/exams/${exam.id}` as Route} className="text-xs font-black text-primary underline">Edit offer</Link></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
