import { AdminHeader, ButtonLinkSmall, Card, DataTable, Field, Flash, StatusPill, SubmitButton, Td, inputClass } from "@/components/admin/ui";
import { saveExam } from "@/app/admin/tests/actions";
import { adminDb } from "@/lib/admin/db";

export const metadata = { title: "Test series" };

const rupees = (paise: number) => (paise === 0 ? "Free" : `₹${paise / 100}`);

export default async function AdminTestsPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const { notice, error } = await searchParams;
  const db = await adminDb();
  const [series, exams] = await Promise.all([
    db.query<{ id: string; title: string; exam: string; price_paise: number; status: string; tests: string }>(
      `select s.id, s.title, e.name as exam, s.price_paise, s.status, (select count(*) from tests t where t.series_id = s.id) as tests
       from test_series s join exams e on e.id = s.exam_id order by s.updated_at desc`
    ),
    db.query<{ id: string; name: string }>("select id, name from exams order by name")
  ]);
  return (
    <div className="grid gap-6">
      <AdminHeader title="Mock test series" description="Exams contain test series; series contain timed mock tests; tests contain approved questions." action={exams.rows.length ? { href: "/admin/tests/series/new", label: "New series" } : undefined} />
      <Flash notice={notice} error={error} />
      <Card title="Add an exam">
        <form action={saveExam} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
          <Field label="Name"><input name="name" required placeholder="SSC CGL" className={inputClass} /></Field>
          <Field label="Slug"><input name="slug" placeholder="ssc-cgl" className={inputClass} /></Field>
          <Field label="Description"><input name="description" className={inputClass} /></Field>
          <SubmitButton>Add exam</SubmitButton>
        </form>
        {exams.rows.length > 0 && <p className="mt-3 text-xs font-semibold text-muted">Exams: {exams.rows.map((exam) => exam.name).join(", ")}</p>}
      </Card>
      <DataTable headers={["Series", "Exam", "Price", "Tests", "Status", ""]} empty="No series yet. Add an exam, then a series.">
        {series.rows.map((row) => (
          <tr key={row.id}>
            <Td className="font-black text-primary">{row.title}</Td>
            <Td>{row.exam}</Td>
            <Td>{rupees(row.price_paise)}</Td>
            <Td>{row.tests}</Td>
            <Td><StatusPill status={row.status} /></Td>
            <Td><ButtonLinkSmall href={`/admin/tests/series/${row.id}`}>Open</ButtonLinkSmall></Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
