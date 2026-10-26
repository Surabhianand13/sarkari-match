import Link from "next/link";
import type { Route } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export const metadata = { title: "My plans", robots: { index: false, follow: false } };

const date = (value: string | null) => (value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "No end");

export default async function BillingPage() {
  const user = await requireUser();
  const db = await getDb();
  const [passes, guides] = db
    ? await Promise.all([
        db.query<{ id: string; title: string; exam_slug: string; slug: string; expires_at: string | null }>(
          `select a.id, s.title, e.slug as exam_slug, s.slug, a.expires_at::text from test_access a join test_series s on s.id = a.series_id join exams e on e.id = s.exam_id
            where a.user_id = $1 and s.price_paise > 0 and a.starts_at <= now() and (a.expires_at is null or a.expires_at > now()) order by a.created_at desc`, [user.id]),
        db.query<{ id: string; name: string; slug: string; expires_at: string | null }>(
          `select g.id, e.name, e.slug, g.expires_at::text from guide_access g join exams e on e.id = g.exam_id
            where g.user_id = $1 and g.starts_at <= now() and (g.expires_at is null or g.expires_at > now()) order by g.created_at desc`, [user.id])
      ])
    : [{ rows: [] }, { rows: [] }];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-black text-primary">My plans</h1>
      <p className="mt-1 text-muted">Your Exam Passes and AI Study Guides. Everything is a one-time payment with no auto-renewal.</p>
      <h2 className="mt-8 text-lg font-black text-primary">Exam Passes</h2>
      <ul className="mt-3 grid gap-3">
        {passes.rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft">
            <span><Link href={`/tests/${row.exam_slug}/${row.slug}` as Route} className="font-black text-primary hover:underline">{row.title}</Link><span className="block text-xs font-semibold text-muted">Valid until {date(row.expires_at)}</span></span>
            <Link href="/dashboard/tests" className="text-sm font-black text-success underline">Open tests</Link>
          </li>
        ))}
        {!passes.rows.length && <li className="rounded-2xl bg-white p-4 text-sm text-muted shadow-soft">No Exam Pass yet. <Link href="/pricing" className="font-black text-primary underline">See pricing</Link></li>}
      </ul>
      <h2 className="mt-8 text-lg font-black text-primary">AI Study Guides</h2>
      <ul className="mt-3 grid gap-3">
        {guides.rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft">
            <span><span className="font-black text-primary">AI Study Guide · {row.name}</span><span className="block text-xs font-semibold text-muted">Valid until {date(row.expires_at)}</span></span>
            <Link href={`/guide/${row.slug}` as Route} className="text-sm font-black text-success underline">Open</Link>
          </li>
        ))}
        {!guides.rows.length && <li className="rounded-2xl bg-white p-4 text-sm text-muted shadow-soft">No AI Study Guide yet. It is available with an Exam Pass.</li>}
      </ul>
    </div>
  );
}
