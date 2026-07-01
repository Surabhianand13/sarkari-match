import { ArrowRight, CheckCircle2, CircleAlert, Info, UserRound } from "lucide-react";
import { ButtonLink, DeadlineBadge, MatchStatusBadge } from "@/components/design-system";
import { demoJobs } from "@/lib/data/catalog";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(params: Record<string, string | string[] | undefined>, key: string) {
  const item = params[key];
  return Array.isArray(item) ? item[0] ?? "" : item ?? "";
}

export default async function EligibilityResultsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const profileRows = [
    ["Qualification", value(params, "qualification") || "Graduate"],
    ["Category", value(params, "category") || "General"],
    ["State", value(params, "state") || "Karnataka"],
    ["Preference", value(params, "department") || "Any department"]
  ];

  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift sm:p-8">
          <CheckCircle2 className="text-[#B9F8CD]" size={38} aria-hidden="true" />
          <h1 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-5xl">Profile submitted. Matching notifications are ready.</h1>
          <p className="mt-3 max-w-3xl leading-7 text-white/75">Based on the information provided, SarkariMatch has prepared a profile-aware shortlist. Always verify the official notification before applying.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {["2 strong matches", "1 possible match", "0 missing info"].map((item) => (
              <div key={item} className="rounded-2xl bg-white/12 p-4">
                <p className="text-2xl font-black">{item.split(" ")[0]}</p>
                <p className="text-sm font-bold capitalize text-white/75">{item.split(" ").slice(1).join(" ")}</p>
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
            {demoJobs.map((job, index) => (
              <article key={job.id} className="rounded-3xl border border-[color:var(--border)] bg-white p-5 shadow-lift">
                <div className="flex flex-wrap gap-2">
                  <MatchStatusBadge status={index === 0 ? "strong" : "possible"} />
                  <DeadlineBadge date={job.applicationEndDate} />
                </div>
                <h2 className="mt-4 text-2xl font-black text-primary">{job.title}</h2>
                <p className="mt-2 text-muted">{index === 0 ? "Your qualification, category and location appear to satisfy the configured demo rules." : "This notification may fit after checking specific trade and domicile rules."}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-mint p-4">
                    <CheckCircle2 className="text-success" size={20} aria-hidden="true" />
                    <p className="mt-2 font-black text-primary">Why you match</p>
                    <p className="mt-1 text-sm text-muted">Qualification and age are checked against post-level rules.</p>
                  </div>
                  <div className="rounded-2xl bg-indigo-soft p-4">
                    <Info className="text-indigo" size={20} aria-hidden="true" />
                    <p className="mt-2 font-black text-primary">Needs verification</p>
                    <p className="mt-1 text-sm text-muted">Confirm cut-off date, fee, documents and official application link.</p>
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
