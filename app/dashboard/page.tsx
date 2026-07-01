import { requireUser } from "@/lib/auth/guards";
import { BellRing, Bookmark, CalendarClock, Wand2 } from "lucide-react";
import { ButtonLink, ProfileCompletionCard } from "@/components/design-system";

export const metadata = { robots: { index: false, follow: false } };

export default async function DashboardPage() {
  await requireUser();
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Dashboard</p>
        <h1 className="mt-2 text-3xl font-black text-primary">Welcome back. Your next notification match starts here.</h1>
        <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <ProfileCompletionCard />
          <section className="rounded-3xl bg-white p-5 shadow-soft">
            <h2 className="text-xl font-black text-primary">Priority today</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DashboardTile icon={CalendarClock} title="Applications closing soon" value="2" />
              <DashboardTile icon={Wand2} title="New strong matches" value="2" />
              <DashboardTile icon={Bookmark} title="Saved notifications" value="0" />
              <DashboardTile icon={BellRing} title="Upcoming reminders" value="0" />
            </div>
          </section>
        </div>
        <nav className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Dashboard sections">
          {[
            ["Matches", "/dashboard/matches"],
            ["Profile", "/dashboard/profile"],
            ["Saved", "/dashboard/saved"],
            ["Applications", "/dashboard/applications"],
            ["Calendar", "/dashboard/calendar"],
            ["Alerts", "/dashboard/alerts"],
            ["Referrals", "/dashboard/referrals"],
            ["Compare", "/dashboard/compare"],
            ["Family", "/dashboard/family"],
            ["Reports", "/dashboard/reports"],
            ["Language", "/dashboard/language"],
            ["Billing", "/dashboard/billing"],
            ["Settings", "/dashboard/settings"]
          ].map(([label, href]) => (
            <ButtonLink key={href} href={href} variant="secondary">{label}</ButtonLink>
          ))}
        </nav>
        <div className="mt-5 rounded-3xl border border-dashed border-[color:var(--border-strong)] bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black text-primary">No notification applications tracked yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Save a notification or start tracking an application to build your personal exam calendar.</p>
          <ButtonLink href="/jobs" className="mt-5">Browse latest notifications</ButtonLink>
        </div>
      </div>
    </div>
  );
}

function DashboardTile({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <Icon className="text-brand-green" size={20} aria-hidden="true" />
      <p className="mt-3 text-3xl font-black text-primary">{value}</p>
      <p className="text-sm font-bold text-muted">{title}</p>
    </div>
  );
}
