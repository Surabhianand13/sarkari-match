import { ArrowRight, CheckCircle2, CircleAlert, Info, UserRound } from "lucide-react";
import { ButtonLink, DeadlineBadge, MatchStatusBadge } from "@/components/design-system";
import { getOptionalUser } from "@/lib/auth/guards";
import { getJobsForMatching } from "@/lib/data/jobs";
import { evaluateMatch } from "@/lib/matching/engine";
import { deriveCandidateProfile } from "@/lib/matching/profile";
import { persistCandidateMatches } from "@/lib/matching/persist";
import type { MatchStatus } from "@/lib/matching/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] ?? "" : item ?? "";
}

const badgeStatusByMatchStatus: Record<MatchStatus, "strong" | "possible" | "needed" | "closed"> = {
  strong_match: "strong",
  possible_match: "possible",
  needs_information: "needed",
  not_eligible: "closed"
};

const reasonByMatchStatus: Record<MatchStatus, string> = {
  strong_match: "Your qualification, category and age satisfy the published eligibility rules.",
  possible_match: "Most rules are satisfied, but review the warnings before applying.",
  needs_information: "Add more profile details to get a confident eligibility check for this notification.",
  not_eligible: "Your profile does not currently satisfy one or more mandatory eligibility rules."
};

export default async function EligibilityResultsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const profile = deriveCandidateProfile({
    dateOfBirth: value(params, "dateOfBirth"),
    category: value(params, "category"),
    qualification: value(params, "qualification"),
    state: value(params, "state")
  });
  const profileRows = [
    ["Qualification", value(params, "qualification") || "Graduate"],
    ["Category", value(params, "category") || "General"],
    ["State", value(params, "state") || "Karnataka"],
    ["Preference", value(params, "department") || "Any department"]
  ];

  const matchableJobs = await getJobsForMatching();
  const results = matchableJobs
    .map(({ job, rules }) => ({ job, result: evaluateMatch(profile, rules) }))
    .sort((a, b) => b.result.score - a.result.score);

  const user = await getOptionalUser();
  if (user) {
    await persistCandidateMatches(user.id, profile, results);
  }

  const strongCount = results.filter((r) => r.result.status === "strong_match").length;
  const possibleCount = results.filter((r) => r.result.status === "possible_match").length;
  const missingCount = results.filter((r) => r.result.status === "needs_information").length;

  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift sm:p-8">
          <CheckCircle2 className="text-[#B9F8CD]" size={38} aria-hidden="true" />
          <h1 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-5xl">Profile submitted. Matching notifications are ready.</h1>
          <p className="mt-3 max-w-3xl leading-7 text-white/75">Based on the information provided, SarkariMatch has prepared a profile-aware shortlist. Always verify the official notification before applying.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              [strongCount, "strong matches"],
              [possibleCount, "possible match"],
              [missingCount, "missing info"]
            ].map(([count, label]) => (
              <div key={label as string} className="rounded-2xl bg-white/12 p-4">
                <p className="text-2xl font-black">{count}</p>
                <p className="text-sm font-bold capitalize text-white/75">{label as string}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-[color:var(--border)] bg-white p-5 shadow-lift">
            <UserRound className="text-success" size={24} aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black text-primary">Candidate match profile</h2>
            <div className="mt-4 grid gap-2">
              {profileRows.map(([label, item]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
                  <span className="text-sm font-bold text-muted">{label}</span>
                  <span className="text-right text-sm font-black text-primary">{item}</span>
                </div>
              ))}
            </div>
            <ButtonLink href="/eligibility" variant="secondary" className="mt-5 w-full">Edit profile</ButtonLink>
          </div>

          <div className="grid gap-4">
            {results.map(({ job, result }) => (
              <article key={job.id} className="rounded-3xl border border-[color:var(--border)] bg-white p-5 shadow-lift">
                <div className="flex flex-wrap gap-2">
                  <MatchStatusBadge status={badgeStatusByMatchStatus[result.status]} />
                  <DeadlineBadge date={job.applicationEndDate} />
                </div>
                <h2 className="mt-4 text-2xl font-black text-primary">{job.title}</h2>
                <p className="mt-2 text-muted">{reasonByMatchStatus[result.status]}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-mint p-4">
                    <CheckCircle2 className="text-success" size={20} aria-hidden="true" />
                    <p className="mt-2 font-black text-primary">Why you match</p>
                    <p className="mt-1 text-sm text-muted">{result.matched_rules[0] ?? "Qualification and age are checked against post-level rules."}</p>
                  </div>
                  <div className="rounded-2xl bg-indigo-soft p-4">
                    <Info className="text-indigo" size={20} aria-hidden="true" />
                    <p className="mt-2 font-black text-primary">Needs verification</p>
                    <p className="mt-1 text-sm text-muted">{result.failed_rules[0] ?? result.missing_information[0] ?? result.warnings[0] ?? "Confirm cut-off date, fee, documents and official application link."}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 min-[390px]:flex-row">
                  <ButtonLink href={`/jobs/${job.slug}`}>View notification <ArrowRight size={16} aria-hidden="true" /></ButtonLink>
                  <ButtonLink href="/jobs" variant="secondary">Browse more</ButtonLink>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-5 rounded-2xl bg-amber-soft p-4 text-sm font-bold text-warning">
          <CircleAlert className="mb-2" size={18} aria-hidden="true" />
          Free users see basic reasons. Pro users see full rule-by-rule explanations and unlimited result history.
        </div>
      </div>
    </div>
  );
}
