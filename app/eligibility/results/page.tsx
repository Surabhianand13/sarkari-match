import { ArrowRight, CheckCircle2, Info, Lock, MessageCircle, UserRound } from "lucide-react";
import { ButtonLink, DeadlineBadge, MatchStatusBadge } from "@/components/design-system";
import { T } from "@/components/i18n/t";
import { getOptionalUser } from "@/lib/auth/guards";
import { getJobsForMatching } from "@/lib/data/jobs";
import { getCurrentPlanCode } from "@/lib/entitlements/current-plan";
import { hasFeature } from "@/lib/entitlements/plans";
import { evaluateMatch } from "@/lib/matching/engine";
import { deriveCandidateProfile } from "@/lib/matching/profile";
import { persistCandidateMatches } from "@/lib/matching/persist";
import type { MatchStatus } from "@/lib/matching/types";
import { buildWhatsAppShareUrl } from "@/lib/utils/whatsapp-share";

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

  const planCode = await getCurrentPlanCode(user?.id ?? null);
  const canSeeFullExplanation = hasFeature(planCode, "full_match_explanation");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarkarimatch.com";

  const strongCount = results.filter((r) => r.result.status === "strong_match").length;
  const possibleCount = results.filter((r) => r.result.status === "possible_match").length;
  const missingCount = results.filter((r) => r.result.status === "needs_information").length;

  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift sm:p-8">
          <CheckCircle2 className="text-[#B9F8CD]" size={38} aria-hidden="true" />
          <h1 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-5xl"><T k="results_headline" /></h1>
          <p className="mt-3 max-w-3xl leading-7 text-white/75">Based on the information provided, SarkariMatch has prepared a profile-aware shortlist. Always verify the official notification before applying.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(
              [
                [strongCount, "stat_strong"],
                [possibleCount, "stat_possible"],
                [missingCount, "stat_missing"]
              ] as const
            ).map(([count, labelKey]) => (
              <div key={labelKey} className="rounded-2xl bg-white/12 p-4">
                <p className="text-2xl font-black">{count}</p>
                <p className="text-sm font-bold capitalize text-white/75"><T k={labelKey} /></p>
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
            {results.map(({ job, result }) => {
              const shareUrl = buildWhatsAppShareUrl(`I'm eligible for ${job.title}! Check yours on SarkariMatch: ${siteUrl}/jobs/${job.slug}`);
              return (
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

                  {canSeeFullExplanation ? (
                    (result.matched_rules.length > 1 || result.failed_rules.length > 0 || result.missing_information.length > 0 || result.warnings.length > 0) && (
                      <div className="mt-3 rounded-2xl bg-surface p-4">
                        <p className="font-black text-primary">Full rule-by-rule explanation</p>
                        <ul className="mt-2 space-y-1 text-sm text-muted">
                          {[...result.matched_rules, ...result.failed_rules, ...result.missing_information, ...result.warnings].map((rule) => (
                            <li key={rule}>• {rule}</li>
                          ))}
                        </ul>
                      </div>
                    )
                  ) : (
                    <div className="relative mt-3 overflow-hidden rounded-2xl bg-surface p-4">
                      <div className="pointer-events-none select-none blur-[3px]">
                        <p className="font-black text-primary">Full rule-by-rule explanation</p>
                        <ul className="mt-2 space-y-1 text-sm text-muted">
                          <li>• Every matched, failed, missing and warning rule for this notification.</li>
                          <li>• Category-wise age relaxation breakdown.</li>
                        </ul>
                      </div>
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 p-4 text-center">
                        <Lock className="text-primary" size={20} aria-hidden="true" />
                        <ButtonLink href="/pricing" className="text-xs">
                          <T k="cta_unlock_explanation" />
                        </ButtonLink>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-3 min-[390px]:flex-row">
                    <ButtonLink href={`/jobs/${job.slug}`}><T k="cta_view_notification" /> <ArrowRight size={16} aria-hidden="true" /></ButtonLink>
                    <ButtonLink href="/jobs" variant="secondary"><T k="cta_browse_more" /></ButtonLink>
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-black text-primary shadow-soft">
                      <MessageCircle size={16} className="text-success" aria-hidden="true" /> <T k="cta_share_whatsapp" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
