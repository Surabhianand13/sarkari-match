import Link from "next/link";
import type { Route } from "next";
import { AdminHeader, Card } from "@/components/admin/ui";
import { getAdminStats, getRecentAudit } from "@/lib/admin/stats";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPage() {
  const [stats, audit] = await Promise.all([getAdminStats(), getRecentAudit()]);

  const tiles: Array<[string, number | undefined, string, string]> = [
    ["Published notifications", stats?.publishedNotifications, "/admin/posts", "Live on the site"],
    ["Recruitments in draft or review", stats?.draftRecruitments, "/admin/recruitments", "Waiting to be published"],
    ["Closing in 7 days", stats?.closingSoon, "/admin/posts", "Check these first"],
    ["Open error reports", stats?.reportsOpen, "/admin/reports", "Reported by candidates"],
    ["Questions awaiting review", stats?.questionsAwaitingReview, "/admin/questions", "AI-checked, need a human"],
    ["Published questions", stats?.publishedQuestions, "/admin/questions", "In the live bank"],
    ["Published test series", stats?.publishedSeries, "/admin/tests", "Visible to students"],
    ["Registered users", stats?.users, "/admin/subscriptions", `${stats?.activeAccess ?? 0} with active test access`]
  ];

  return (
    <div>
      <AdminHeader title="Overview" description="What needs attention across notifications, mock tests and the business." />
      {!stats && <p className="mb-4 rounded-xl bg-amber-soft px-4 py-3 text-sm font-bold text-warning">No database is configured, so live numbers are unavailable.</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([label, value, href, hint]) => (
          <Link key={label} href={href as Route} className="rounded-2xl border border-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5">
            <p className="text-xs font-black uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-3xl font-black text-primary">{value ?? "-"}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{hint}</p>
          </Link>
        ))}
      </div>
      <Card title="Recent activity" className="mt-6">
        {audit.length ? (
          <ul className="divide-y divide-border text-sm">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-black text-primary">{entry.action} <span className="font-semibold text-muted">{entry.entity_type}</span></span>
                <span className="text-xs font-semibold text-muted">{entry.actor_email ?? "system"} · {new Date(entry.created_at).toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No admin activity recorded yet.</p>
        )}
      </Card>
    </div>
  );
}
