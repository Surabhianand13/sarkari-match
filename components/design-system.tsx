import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BellRing,
  BookOpen,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GraduationCap,
  HeartHandshake,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  Timer,
  UserRound,
  Wand2
} from "lucide-react";
import type { JobPost } from "@/lib/data/catalog";
import { formatDate } from "@/lib/utils/format";

export function ButtonLink({ href, children, variant = "primary", className = "" }: { href: Route | string; children: React.ReactNode; variant?: "primary" | "secondary" | "dark" | "ghost"; className?: string }) {
  const styles = {
    primary: "bg-[linear-gradient(135deg,#18B943,#0D9488)] text-white shadow-green hover:-translate-y-0.5 hover:shadow-green-lg",
    secondary: "border border-[color:var(--border)] bg-white text-primary shadow-soft hover:-translate-y-0.5 hover:border-[color:var(--primary)]",
    dark: "bg-primary text-white shadow-soft hover:-translate-y-0.5",
    ghost: "bg-transparent text-primary hover:bg-mint"
  };
  return (
    <Link href={href as Route} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold transition duration-200 active:translate-y-0 ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, body, align = "left" }: { eyebrow?: string; title: string; body?: string; align?: "left" | "center" }) {
  return (
    <div className={`mb-6 ${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}`}>
      {eyebrow && <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-green">{eyebrow}</p>}
      <h2 className="mt-2 text-balance text-2xl font-black tracking-tight text-primary sm:text-3xl">{title}</h2>
      {body && <p className="mt-3 text-pretty text-base leading-7 text-muted">{body}</p>}
    </div>
  );
}

export function MatchStatusBadge({ status = "strong" }: { status?: "strong" | "possible" | "needed" | "closed" }) {
  const map = {
    strong: ["Strong Match", "bg-mint text-success ring-success/15", CheckCircle2],
    possible: ["Possible Match", "bg-amber-soft text-warning ring-warning/20", CircleAlert],
    needed: ["Info Needed", "bg-indigo-soft text-indigo ring-indigo/20", Wand2],
    closed: ["Applications Closed", "bg-red-50 text-error ring-error/15", Clock3]
  } as const;
  const [label, classes, Icon] = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${classes}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

export function DeadlineBadge({ date }: { date: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 text-xs font-black text-warning ring-1 ring-warning/20">
      <Timer size={14} aria-hidden="true" />
      Last date {formatDate(date)}
    </span>
  );
}

export function VerificationBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-soft px-3 py-1 text-xs font-black text-teal ring-1 ring-teal/15">
      <ShieldCheck size={14} aria-hidden="true" />
      Official-source checked
    </span>
  );
}

export function FoundingOfferBanner() {
  return (
    <section className="bg-[linear-gradient(90deg,#082653,#0B2D63_48%,#0D9488)] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="offer-shimmer mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20">
            <Star size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B9F8CD]">Founding Offer</p>
            <p className="text-sm font-black sm:text-base">Get 3 Months of SarkariMatch Pro for ₹49</p>
            <p className="mt-0.5 text-xs text-white/75">Limited founding offer. No auto-renewal.</p>
          </div>
        </div>
        <ButtonLink href="/pricing" variant="secondary" className="w-full bg-white/95 text-primary sm:w-auto">
          Claim Offer <ArrowRight size={16} aria-hidden="true" />
        </ButtonLink>
      </div>
    </section>
  );
}

export function SearchCommandBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className="search-shell">
      <form action="/jobs" className={`search-bar ${compact ? "search-bar-compact" : ""}`}>
        <label className="sr-only" htmlFor={compact ? "compact-search" : "home-search"}>
          Search govt job notifications, exam notifications, organisations or qualifications
        </label>
        <Search className="text-muted" size={21} aria-hidden="true" />
        <input id={compact ? "compact-search" : "home-search"} name="q" placeholder="Search govt job notifications, exams or qualifications" className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-foreground outline-none placeholder:text-muted" />
        <button className="rounded-full bg-primary px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#082653] active:scale-[0.98]">Search</button>
      </form>
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["10th Pass Notifications", "/jobs/qualification/10th-pass"],
            ["Graduate Notifications", "/jobs/qualification/graduate"],
            ["Civil Engineering Notifications", "/jobs?q=Civil%20Engineering"],
            ["Closing Soon Notifications", "/jobs?status=closing-soon"],
            ["Karnataka Notifications", "/jobs/state/karnataka"]
          ].map(([label, href]) => (
            <Link key={label} href={href as Route} className="rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1.5 text-xs font-bold text-muted transition hover:border-[color:var(--brand-green)] hover:text-primary">
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnimatedHeroMatchPreview() {
  return (
    <div className="match-preview workflow-preview" aria-label="How SarkariMatch matches govt job and exam notifications">
      <div className="match-grid" />
      <div className="workflow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-success">How SarkariMatch works</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-primary">Official match profile for govt notifications</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Sign in once. Build your profile. See eligible notifications. Apply through official links.</p>
          </div>
          <span className="workflow-verified"><BadgeCheck size={16} aria-hidden="true" /> Official-source checked</span>
        </div>

        <div className="workflow-steps" aria-hidden="true">
          {[
            [UserRound, "Sign in", "Save your profile"],
            [Wand2, "Find matches", "Rules checked"],
            [CheckCircle2, "Eligible list", "Strong matches first"],
            [ArrowRight, "Apply", "Official link"]
          ].map(([Icon, title, body], index) => (
            <div key={title as string} className={`workflow-step workflow-step-${index + 1}`}>
              <span><Icon size={18} aria-hidden="true" /></span>
              <div>
                <p>{title as string}</p>
                <small>{body as string}</small>
              </div>
            </div>
          ))}
        </div>

        <div className="workflow-results">
          {[
            ["SSC Assistant Officer", "96% eligible", "Strong Match"],
            ["Railway Technician", "78% eligible", "Possible Match"]
          ].map(([title, score, label]) => (
          <div key={title} className="workflow-result-card">
            <div>
              <p className="text-sm font-black text-primary">{title}</p>
              <p className="mt-1 text-xs font-bold text-muted">{score}</p>
            </div>
            <span>{label}</span>
          </div>
        ))}
          <Link href="/eligibility" className="workflow-apply">Find My Matches <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </div>
  );
}

const qualificationMeta: Record<string, [React.ElementType, string, string, string]> = {
  "10th-pass": [BookOpen, "bg-mint text-success", "Entry-level notifications", "10th Pass"],
  "12th-pass": [GraduationCap, "bg-cyan-soft text-teal", "Clerical and trainee notifications", "12th Pass"],
  iti: [BriefcaseBusiness, "bg-amber-soft text-warning", "Trade-based notifications", "ITI"],
  diploma: [Award, "bg-indigo-soft text-indigo", "Technical notifications", "Diploma"],
  graduate: [GraduationCap, "bg-mint text-success", "Broadest eligibility", "Graduate"],
  btech: [Wand2, "bg-cyan-soft text-teal", "Engineering notifications", "B.Tech/B.E"],
  postgraduate: [BookOpen, "bg-indigo-soft text-indigo", "MBA, MSc, MCom, MS and more", "Post Graduates"],
  nursing: [HeartHandshake, "bg-rose-50 text-rose-700", "Healthcare notifications", "Nursing"]
};

export function QualificationCard({ slug }: { slug: string }) {
  const [Icon, accent, label, title] = qualificationMeta[slug] ?? [BookOpen, "bg-mint text-success", "Open notifications", slug.replaceAll("-", " ")];
  return (
    <Link href={`/jobs/qualification/${slug}` as Route} className="group min-h-32 rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-soft transition duration-200 hover:-translate-y-1 hover:border-[color:var(--brand-green)] hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-11 items-center justify-center rounded-2xl ${accent}`}><Icon size={21} aria-hidden="true" /></span>
        <ArrowRight className="text-muted transition group-hover:translate-x-1 group-hover:text-primary" size={18} aria-hidden="true" />
      </div>
      <p className="mt-4 text-lg font-black text-primary">{title}</p>
      <p className="mt-1 text-sm font-semibold text-muted">{label}</p>
    </Link>
  );
}

export function PolishedJobCard({ job, index = 0 }: { job: JobPost; index?: number }) {
  const closingSoon = new Date(job.applicationEndDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 45;
  return (
    <article className="job-card group" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <MatchStatusBadge status={job.applicationStatus === "open" ? "strong" : "closed"} />
            {closingSoon && job.applicationStatus === "open" && <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-200">Closing Soon</span>}
          </div>
          <h2 className="mt-3 text-pretty text-lg font-black leading-tight text-primary sm:text-xl">
            <Link href={`/jobs/${job.slug}` as Route}>{job.title}</Link>
          </h2>
          <p className="mt-1 text-sm font-semibold text-muted">{job.organisation}</p>
        </div>
        <Link href={`/dashboard/saved?post=${job.slug}` as Route} className="save-button" aria-label={`Save ${job.title}`}>
          <Star size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <VerificationBadge />
        <DeadlineBadge date={job.applicationEndDate} />
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <InfoPill icon={GraduationCap} label={job.qualification} />
        <InfoPill icon={MapPin} label={job.state} />
        <InfoPill icon={BriefcaseBusiness} label={`${job.vacancyCount} vacancies`} />
        <InfoPill icon={CalendarClock} label={job.salaryText} />
      </dl>
      <div className="mt-4 rounded-2xl bg-mint/70 p-3 text-sm font-bold leading-6 text-success">
        Match preview: age, education, domicile and experience rules checked.
      </div>
      <div className="mt-4 grid gap-2 min-[360px]:grid-cols-2">
        <ButtonLink href={`/jobs/${job.slug}` as Route} variant="primary">View notification <ArrowRight size={16} aria-hidden="true" /></ButtonLink>
        <ButtonLink href="/eligibility" variant="secondary">Check eligibility</ButtonLink>
      </div>
    </article>
  );
}

function InfoPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex min-h-10 items-center gap-2 rounded-2xl bg-surface px-3 py-2 font-bold text-muted">
      <Icon size={16} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function HowItWorksTimeline() {
  const steps = [
    ["Build your profile", "Add age, qualification, category and preferences once.", UserRound],
    ["Eligibility is checked", "SarkariMatch compares your profile with verified post-level rules.", Wand2],
    ["Track matching notifications", "Save govt job and exam notifications, apply through official links and never miss a deadline.", BellRing]
  ] as const;
  return (
    <div className="timeline">
      {steps.map(([title, body, Icon], index) => (
        <div key={title} className="timeline-step">
          <span className="timeline-index">Step {index + 1}</span>
          <div className="timeline-card">
            <Icon className="text-brand-green" size={24} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PricingCard({
  title,
  price,
  priceNote,
  trustBadge,
  body,
  features,
  featured = false,
  actionHref,
  actionLabel
}: {
  title: React.ReactNode;
  price: React.ReactNode;
  priceNote?: React.ReactNode;
  trustBadge?: React.ReactNode;
  body: React.ReactNode;
  features: string[];
  featured?: boolean;
  actionHref?: string;
  actionLabel?: React.ReactNode;
}) {
  return (
    <section className={`pricing-card ${featured ? "pricing-featured" : ""}`}>
      {featured && <span className="mb-4 inline-flex rounded-full bg-amber-soft px-3 py-1 text-xs font-black text-warning">Best early offer</span>}
      <h2 className="text-xl font-black text-primary">{title}</h2>
      <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{price}</p>
      {priceNote && <p className="mt-1 text-xs font-bold text-muted">{priceNote}</p>}
      {trustBadge && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[0.68rem] font-black text-success">{trustBadge}</span>}
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      <ul className="mt-5 space-y-3 text-sm font-semibold text-muted">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2"><Check className="mt-0.5 shrink-0 text-brand-green" size={16} aria-hidden="true" />{feature}</li>
        ))}
      </ul>
      {actionHref && actionLabel && <ButtonLink href={actionHref} className="mt-6 w-full">{actionLabel}</ButtonLink>}
    </section>
  );
}

export function EmptyState({ title, body, actionHref, actionLabel }: { title: string; body: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[color:var(--border-strong)] bg-white p-6 text-center shadow-soft">
      <span className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-mint text-success"><Search size={24} aria-hidden="true" /></span>
      <h2 className="mt-4 text-xl font-black text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>
      {actionHref && actionLabel && <ButtonLink href={actionHref} className="mt-5">{actionLabel}</ButtonLink>}
    </div>
  );
}

export function ProfileCompletionCard() {
  return (
    <section className="rounded-3xl bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-5 text-white shadow-lift">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B9F8CD]">Profile strength</p>
      <div className="mt-3 flex items-end justify-between">
        <h2 className="text-2xl font-black">75% complete</h2>
        <span className="text-sm font-bold text-white/75">Add domicile next</span>
      </div>
      <div className="mt-4 h-3 rounded-full bg-white/15">
        <div className="h-3 w-3/4 rounded-full bg-[linear-gradient(90deg,#32D66B,#B9F8CD)]" />
      </div>
    </section>
  );
}
