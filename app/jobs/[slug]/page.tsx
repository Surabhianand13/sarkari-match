import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, Bookmark, BriefcaseBusiness, CalendarClock, ExternalLink, GraduationCap, MapPin, MessageCircle } from "lucide-react";
import { ButtonLink, DeadlineBadge, MatchStatusBadge, VerificationBadge } from "@/components/design-system";
import { T } from "@/components/i18n/t";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/brand";
import { getJobWithRulesBySlug, getJobs } from "@/lib/data/jobs";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils/format";
import { buildWhatsAppShareUrl } from "@/lib/utils/whatsapp-share";

export const revalidate = 3600;

export async function generateStaticParams() {
  const jobs = await getJobs();
  return jobs.map((job) => ({ slug: job.slug }));
}

type Params = Promise<{ slug: string }>;

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function dateOrEmpty(value: string) {
  return value ? formatDate(value) : "as per official notification";
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const found = await getJobWithRulesBySlug(slug);
  if (!found) return {};
  const { job } = found;
  return buildMetadata({
    title: `${job.title}: Eligibility, Age Limit, Last Date and Apply Online`,
    description: `${job.title} by ${job.organisation}: ${job.vacancyCount} vacancies, ${job.qualification} qualification, last date ${dateOrEmpty(job.applicationEndDate)}. Check eligibility and apply through the official link.`,
    path: `/jobs/${job.slug}`,
    type: "article"
  });
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const found = await getJobWithRulesBySlug(slug);
  if (!found) notFound();
  const { job, rules } = found;
  const isOpen = job.applicationStatus === "open";
  const officialHost = safeHostname(job.officialApplicationUrl);
  const siteUrl = absoluteUrl("/");
  const shareUrl = buildWhatsAppShareUrl(`${job.title} — check your eligibility on Sarkari Match: ${siteUrl.replace(/\/$/, "")}/jobs/${job.slug}`);

  const related = (await getJobs())
    .filter((other) => other.slug !== job.slug && (other.department === job.department || other.state === job.state))
    .slice(0, 4);

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Govt Job Notifications", path: "/jobs" },
    { name: job.title, path: `/jobs/${job.slug}` }
  ];

  const ruleGroups = [
    { title: "Age limit", items: rules.ageRules.map((rule) => rule.ruleText) },
    { title: "Educational qualification", items: rules.qualificationRules.map((rule) => rule.ruleText) },
    { title: "Experience", items: rules.experienceRules.map((rule) => rule.ruleText) },
    { title: "Other conditions", items: rules.otherRules.map((rule) => rule.ruleText) }
  ].filter((group) => group.items.length);

  const overview = `${job.title} is a ${job.department} govt job notification from ${job.organisation} for ${job.qualification} candidates, with ${job.vacancyCount} vacancies in ${job.state}. ${
    job.applicationEndDate ? `Applications close on ${formatDate(job.applicationEndDate)}.` : "Check the official notification for the closing date."
  } This page was last verified on ${dateOrEmpty(job.verifiedAt)} against the official notification.`;

  const sections: Array<{ title: string; body: React.ReactNode }> = [
    {
      title: "Eligibility",
      body: ruleGroups.length ? (
        <div className="grid gap-4">
          {ruleGroups.map((group) => (
            <div key={group.title}>
              <h3 className="font-black text-primary">{group.title}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
          <p className="text-sm text-muted">Rules are summarised from the official notification. <Link href="/eligibility" className="font-black text-primary underline">Check your own eligibility</Link> against them.</p>
        </div>
      ) : (
        <p className="text-muted">Detailed post-wise eligibility is published in the official notification. <Link href="/eligibility" className="font-black text-primary underline">Check your eligibility</Link> once rules are added.</p>
      )
    },
    {
      title: "Important dates",
      body: (
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Last date to apply: {dateOrEmpty(job.applicationEndDate)}</li>
          <li>Published on Sarkari Match: {dateOrEmpty(job.publishedAt)}</li>
          <li>Last verified: {dateOrEmpty(job.verifiedAt)}</li>
        </ul>
      )
    },
    {
      title: "Vacancies and salary",
      body: <p className="text-muted">Total vacancies: {job.vacancyCount}. Pay: {job.salaryText}.</p>
    },
    {
      title: "How to apply",
      body: (
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Read the official notification and confirm age, qualification and category rules.</li>
          <li>Run the free eligibility check on Sarkari Match.</li>
          <li>Open the official application page{officialHost ? ` (${officialHost})` : ""} and complete the form. Sarkari Match never collects application fees.</li>
          <li>Keep your documents and the application number safe for later stages.</li>
        </ol>
      )
    },
    {
      title: "Official links",
      body: (
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li><a className="font-black text-primary underline" href={job.officialNotificationUrl} rel="nofollow noopener noreferrer">Official notification</a></li>
          <li><a className="font-black text-primary underline" href={job.officialApplicationUrl} rel="nofollow noopener noreferrer">Official application page</a></li>
        </ul>
      )
    }
  ];

  return (
    <article className="bg-surface pb-32 md:pb-12">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          ...(isOpen
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "JobPosting",
                  title: job.title,
                  description: job.description || overview,
                  datePosted: job.publishedAt || undefined,
                  validThrough: job.applicationEndDate || undefined,
                  employmentType: "FULL_TIME",
                  directApply: false,
                  url: absoluteUrl(`/jobs/${job.slug}`),
                  hiringOrganization: { "@type": "Organization", name: job.organisation },
                  jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressRegion: job.state, addressCountry: "IN" } }
                }
              ]
            : [])
        ]}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Breadcrumbs items={crumbs} />
        {!isOpen && <div className="mb-5 rounded-2xl border border-warning bg-amber-soft p-4 font-black text-warning">Applications Closed</div>}
        <div className="rounded-[2rem] bg-white p-5 shadow-lift sm:p-8">
          <div className="flex flex-wrap gap-2">
            <MatchStatusBadge status={isOpen ? "strong" : "closed"} />
            <DeadlineBadge date={job.applicationEndDate} />
            <VerificationBadge />
          </div>
          <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-success">{job.organisation}</p>
          <h1 className="mt-2 max-w-4xl text-balance text-3xl font-black tracking-tight text-primary sm:text-5xl">{job.title}</h1>
          <p className="mt-4 max-w-3xl text-pretty text-lg leading-8 text-muted">{overview}</p>
          <div className="mt-6 hidden flex-wrap items-start gap-3 md:flex">
            <ButtonLink href="/eligibility">Check My Eligibility <ArrowRight size={16} aria-hidden="true" /></ButtonLink>
            {isOpen && (
              <div className="flex flex-col gap-1">
                <a href={job.officialApplicationUrl} rel="nofollow noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-black text-primary shadow-soft transition hover:-translate-y-0.5">
                  Apply on Official Website <ExternalLink size={16} aria-hidden="true" />
                </a>
                {officialHost && (
                  <span className="px-1 text-xs font-bold text-muted">
                    <T k="redirects_to" as="span" /> {officialHost}
                  </span>
                )}
              </div>
            )}
            <Link href={`/dashboard/saved?post=${job.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-black text-primary shadow-soft"><Bookmark size={16} aria-hidden="true" /> Save Notification</Link>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--border)] bg-white px-5 py-3 text-sm font-black text-primary shadow-soft">
              <MessageCircle size={16} className="text-success" aria-hidden="true" /> <T k="cta_share_whatsapp" />
            </a>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Row label="Recruitment" value={job.recruitmentTitle} />
          <Row label="Department" value={job.department} />
          <Row label="Location" value={job.state} />
          <Row label="Qualification" value={job.qualification} />
          <Row label="Vacancies" value={String(job.vacancyCount)} />
          <Row label="Salary" value={job.salaryText} />
          <Row label="Last verified" value={dateOrEmpty(job.verifiedAt)} />
          <Row label="Verified by" value="Sarkari Match editorial team" />
        </dl>
        <div className="mt-5 rounded-3xl bg-[linear-gradient(135deg,#EAFBF0,#E8F8FA)] p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <Fact icon={GraduationCap} label="Qualification" value={job.qualification} />
            <Fact icon={MapPin} label="Location" value={job.state} />
            <Fact icon={BriefcaseBusiness} label="Vacancies" value={`${job.vacancyCount}`} />
            <Fact icon={CalendarClock} label="Last date" value={dateOrEmpty(job.applicationEndDate)} />
          </div>
        </div>
        {sections.map((section) => (
          <section key={section.title} className="mt-4 rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-soft">
            <h2 className="text-lg font-black text-primary">{section.title}</h2>
            <div className="mt-3">{section.body}</div>
          </section>
        ))}
        {related.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xl font-black text-primary">Related notifications</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {related.map((other) => (
                <li key={other.id}>
                  <Link href={`/jobs/${other.slug}` as Route} className="block rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-soft transition hover:-translate-y-0.5">
                    <span className="font-black text-primary">{other.title}</span>
                    <span className="mt-1 block text-sm text-muted">{other.organisation} · {other.qualification} · last date {dateOrEmpty(other.applicationEndDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-white/70 bg-white/95 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-12px_34px_rgba(11,45,99,0.12)] backdrop-blur md:hidden">
        {isOpen && officialHost && (
          <p className="px-3 pt-2 text-center text-[0.65rem] font-bold text-muted">
            <T k="redirects_to" as="span" /> {officialHost}
          </p>
        )}
        <div className="grid grid-cols-4 gap-2 p-3">
          <Link href="/eligibility" className="min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-2 py-3 text-center text-xs font-black text-white shadow-green">Check Eligibility</Link>
          {isOpen ? (
            <a href={job.officialApplicationUrl} rel="nofollow noopener noreferrer" className="min-h-12 rounded-full border border-border bg-white px-2 py-3 text-center text-xs font-black text-primary">Official Apply</a>
          ) : (
            <Link href="/jobs" className="min-h-12 rounded-full border border-border bg-white px-2 py-3 text-center text-xs font-black text-primary">Similar Notifications</Link>
          )}
          <Link href={`/dashboard/saved?post=${job.slug}`} className="min-h-12 rounded-full border border-border bg-white px-2 py-3 text-center text-xs font-black text-primary">Save</Link>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-full border border-border bg-white px-2 py-3 text-primary" aria-label="Share on WhatsApp">
            <MessageCircle size={18} className="text-success" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft">
      <dt className="text-xs font-black uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-black text-foreground">{value}</dd>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/80 p-4">
      <Icon className="text-brand-green" size={20} aria-hidden="true" />
      <p className="mt-2 text-xs font-black uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-black text-primary">{value}</p>
    </div>
  );
}
