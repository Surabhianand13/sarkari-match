import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bookmark, BriefcaseBusiness, CalendarClock, ExternalLink, GraduationCap, MapPin, MessageCircle } from "lucide-react";
import { ButtonLink, DeadlineBadge, MatchStatusBadge, VerificationBadge } from "@/components/design-system";
import { T } from "@/components/i18n/t";
import { getJobBySlug } from "@/lib/data/jobs";
import { formatDate } from "@/lib/utils/format";
import { buildWhatsAppShareUrl } from "@/lib/utils/whatsapp-share";

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) return {};
  return {
    title: `${job.title}: Govt Job Notification, Eligibility, Age Limit and Apply Online`,
    description: `${job.title} govt job notification details, eligibility summary, last date, official links and SarkariMatch eligibility guidance.`
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);
  if (!job) notFound();
  const isOpen = job.applicationStatus === "open";
  const officialHost = safeHostname(job.officialApplicationUrl);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarkarimatch.com";
  const shareUrl = buildWhatsAppShareUrl(`${job.title} — check your eligibility on SarkariMatch: ${siteUrl}/jobs/${job.slug}`);

  return (
    <article className="bg-surface pb-32 md:pb-12">
      <div className="mx-auto max-w-6xl px-4 py-8">
      {!isOpen && <div className="mb-5 rounded-2xl border border-warning bg-amber-soft p-4 font-black text-warning">Applications Closed</div>}
      <div className="rounded-[2rem] bg-white p-5 shadow-lift sm:p-8">
        <div className="flex flex-wrap gap-2">
          <MatchStatusBadge status={isOpen ? "strong" : "closed"} />
          <DeadlineBadge date={job.applicationEndDate} />
          <VerificationBadge />
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-success">{job.organisation}</p>
        <h1 className="mt-2 max-w-4xl text-balance text-3xl font-black tracking-tight text-primary sm:text-5xl">{job.title}</h1>
        <p className="mt-4 max-w-3xl text-pretty text-lg leading-8 text-muted">
          {job.qualification} candidates can review this {job.department} govt job notification. Last date: {formatDate(job.applicationEndDate)}. Vacancies: {job.vacancyCount}.
        </p>
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
        <Row label="Last verified" value={formatDate(job.verifiedAt)} />
        <Row label="Verified by" value="SarkariMatch editorial team" />
      </dl>
      <div className="mt-5 rounded-3xl bg-[linear-gradient(135deg,#EAFBF0,#E8F8FA)] p-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <Fact icon={GraduationCap} label="Qualification" value={job.qualification} />
          <Fact icon={MapPin} label="Location" value={job.state} />
          <Fact icon={BriefcaseBusiness} label="Vacancies" value={`${job.vacancyCount}`} />
          <Fact icon={CalendarClock} label="Last date" value={formatDate(job.applicationEndDate)} />
        </div>
      </div>
      {["Eligibility", "Important dates", "Vacancies", "Salary", "Fees", "Selection process", "How to apply", "Official links"].map((section, index) => (
        <details key={section} className="mt-4 rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-soft" open={index < 2}>
          <summary className="cursor-pointer text-lg font-black text-primary">{section}</summary>
          <p className="mt-3 text-muted">{job.description}</p>
        </details>
      ))}
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
      {isOpen && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "JobPosting",
              title: job.title,
              hiringOrganization: { "@type": "Organization", name: job.organisation },
              validThrough: job.applicationEndDate,
              employmentType: "FULL_TIME",
              jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressRegion: job.state, addressCountry: "IN" } },
              description: job.description
            })
          }}
        />
      )}
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
