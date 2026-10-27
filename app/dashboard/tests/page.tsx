import Link from "next/link";
import type { Route } from "next";
import { EmptyState, SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";
import { listAccessibleSeries, listAttempts } from "@/lib/tests/attempts";
import { getNextTests } from "@/lib/tests/next";

export const metadata = { title: "My tests", robots: { index: false, follow: false } };

export default async function MyTestsPage() {
  const user = await requireUser();
  const [attempts, series, next] = await Promise.all([listAttempts(user.id), listAccessibleSeries(user.id), getNextTests(user.id)]);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SectionHeading eyebrow="Test series" title="My tests" body="Your purchased series and every attempt, with scores and solutions." />
      {next.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {next.map((item) => (
            <Link key={item.seriesSlug} href={`/tests/${item.examSlug}/${item.seriesSlug}/${item.testSlug}` as Route} className="rounded-2xl border-2 border-[rgba(24,185,67,0.35)] bg-mint/50 p-4 shadow-soft">
              <p className="text-xs font-black uppercase tracking-wide text-success">Up next</p>
              <p className="mt-1 font-black text-primary">{item.title}</p>
              <p className="text-xs font-semibold text-muted">{item.seriesTitle}</p>
            </Link>
          ))}
        </div>
      )}
      {series.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {series.map((item) => (
            <Link key={item.slug} href={`/tests/${item.exam_slug}/${item.slug}` as Route} className="rounded-2xl bg-white p-4 shadow-soft">
              <p className="font-black text-primary">{item.title}</p>
              <p className="text-xs font-semibold text-muted">{item.expires_at ? `Access until ${new Date(item.expires_at).toLocaleDateString("en-IN")}` : "Lifetime access"}</p>
            </Link>
          ))}
        </div>
      )}
      {attempts.length ? (
        <ul className="grid gap-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link href={(attempt.status === "submitted" ? `/tests/attempt/${attempt.id}/result` : `/tests/attempt/${attempt.id}`) as Route} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-soft">
                <span><span className="block font-black text-primary">{attempt.test_title}</span><span className="text-xs font-semibold text-muted">{attempt.series_title} · {new Date(attempt.started_at).toLocaleDateString("en-IN")}</span></span>
                <span className="text-sm font-black text-primary">{attempt.status === "submitted" ? `${attempt.score} / ${attempt.max_score}` : "Continue"}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No tests attempted yet" body="Take the free sample test to see how it works." actionHref="/tests" actionLabel="Browse test series" />
      )}
    </div>
  );
}
