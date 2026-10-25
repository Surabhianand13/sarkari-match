import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { getJobs } from "@/lib/data/jobs";
import { ButtonLink, DeadlineBadge, EmptyState, MatchStatusBadge, SectionHeading } from "@/components/design-system";
import type { MatchStatus } from "@/lib/matching/types";

export const metadata = { robots: { index: false, follow: false } };

const badgeStatusByMatchStatus: Record<MatchStatus, "strong" | "possible" | "needed" | "closed"> = {
  strong_match: "strong",
  possible_match: "possible",
  needs_information: "needed",
  not_eligible: "closed"
};

async function getSavedMatches(userId: string) {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ post_id: string; status: string; score: number }>(
    "select post_id, status, score from match_results where user_id = $1 order by score desc",
    [userId]
  );
  return rows;
}

export default async function MatchesPage() {
  const user = await requireUser();
  const [matches, jobs] = await Promise.all([getSavedMatches(user.id), getJobs()]);
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const rows = matches.map((match) => ({ match, job: jobById.get(match.post_id) })).filter((row) => row.job);

  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeading eyebrow="Matches" title="Your strongest notification matches" body="Ranked by your last submitted eligibility profile." />
        {rows.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map(({ match, job }) => (
              <article key={job!.id} className="rounded-3xl border border-[color:var(--border)] bg-white p-5 shadow-lift">
                <div className="flex flex-wrap gap-2">
                  <MatchStatusBadge status={badgeStatusByMatchStatus[match.status as MatchStatus]} />
                  <DeadlineBadge date={job!.applicationEndDate} />
                </div>
                <h2 className="mt-3 text-xl font-black text-primary">{job!.title}</h2>
                <p className="mt-1 text-sm font-semibold text-muted">{job!.organisation}</p>
                <ButtonLink href={`/jobs/${job!.slug}`} className="mt-4">View notification <ArrowRight size={16} aria-hidden="true" /></ButtonLink>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No matches yet" body="Run the eligibility check to generate your ranked notification matches." actionHref="/eligibility" actionLabel="Check my eligibility" />
        )}
      </div>
    </div>
  );
}
