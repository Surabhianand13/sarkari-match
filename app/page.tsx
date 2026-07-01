import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BadgeCheck, BellRing, Building2, MapPinned, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { JobCard } from "@/components/job-card";
import {
  AnimatedHeroMatchPreview,
  ButtonLink,
  FoundingOfferBanner,
  HowItWorksTimeline,
  PricingCard,
  QualificationCard,
  SearchCommandBar,
  SectionHeading
} from "@/components/design-system";
import { departments, qualificationPages, states } from "@/lib/data/catalog";
import { getJobs } from "@/lib/data/jobs";

export default async function HomePage() {
  const jobs = await getJobs();
  const closingSoon = [...jobs].sort((a, b) => a.applicationEndDate.localeCompare(b.applicationEndDate));

  return (
    <div className="overflow-hidden">
      <FoundingOfferBanner />
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(24,185,67,0.16),transparent_26rem),radial-gradient(circle_at_80%_15%,rgba(99,102,241,0.12),transparent_24rem)]" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-4 sm:py-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start lg:py-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,185,67,0.22)] bg-mint px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-success">
              <Sparkles size={14} aria-hidden="true" />
              India’s smarter govt job and exam notification matching platform
            </div>
            <h1 className="mt-5 max-w-3xl text-balance text-[2.35rem] font-black leading-[1.04] tracking-tight text-primary sm:text-6xl">
              Find govt job and exam notifications you are eligible for.
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base font-medium leading-7 text-muted sm:text-lg sm:leading-8">
              Create your profile once. SarkariMatch checks your age, qualification, category and preferences to show relevant govt job and exam notifications.
            </p>
            <div className="mt-6 flex flex-col gap-3 min-[390px]:flex-row">
              <ButtonLink href="/eligibility" className="w-full min-[390px]:w-auto">
                Find My Matches <ArrowRight size={17} aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="/jobs" variant="secondary" className="w-full min-[390px]:w-auto">
                Browse Notifications
              </ButtonLink>
            </div>
            <div className="mt-6 grid gap-2 text-sm font-bold text-muted sm:grid-cols-3">
              {[
                [ShieldCheck, "Verified notifications"],
                [Wand2, "Eligibility checks"],
                [BellRing, "Deadline reminders"]
              ].map(([Icon, label]) => (
                <div key={label as string} className="flex items-center gap-2 rounded-full bg-white/75 px-3 py-2 shadow-soft">
                  <Icon className="text-brand-green" size={17} aria-hidden="true" />
                  {label as string}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <SearchCommandBar />
              <ProofCards />
            </div>
          </div>
          <AnimatedHeroMatchPreview />
        </div>
      </section>

      <Band>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Freshly added" title="Latest govt job and exam notifications" body="Recently published and recently verified notifications while live Supabase content is being connected." />
          <ButtonLink href="/jobs" variant="secondary">View all latest notifications</ButtonLink>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{jobs.map((job, index) => <JobCard key={job.id} job={job} index={index} />)}</div>
      </Band>

      <Band>
        <SectionHeading eyebrow="Browse faster" title="Popular qualifications" body="Start from the qualification you already have and discover notifications that fit your eligibility profile." />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {qualificationPages.slice(1, 9).map((slug) => <QualificationCard key={slug} slug={slug} />)}
        </div>
      </Band>

      <Band tone="cool">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Act in time" title="Notifications closing soon" body="Prioritise govt job and exam notifications where the application window needs attention first." />
          <ButtonLink href="/jobs" variant="secondary">View all notifications</ButtonLink>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">{closingSoon.map((job, index) => <JobCard key={job.id} job={job} index={index} />)}</div>
      </Band>

      <section className="bg-[#071f46] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#B9F8CD]">How matching works</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">A calmer way to find the right govt job and exam notifications.</h2>
            <p className="mt-3 leading-7 text-white/70">SarkariMatch turns noisy notifications into a structured, profile-aware shortlist you can act on.</p>
          </div>
          <div className="mt-8">
            <HowItWorksTimeline />
          </div>
        </div>
      </section>

      <Band tone="split">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeading eyebrow="Explore by category" title="Popular departments" body="Jump into the departments candidates search for most often." />
            <DepartmentGrid items={departments} />
          </div>
          <div>
            <SectionHeading eyebrow="Location-aware" title="State-wise notifications" body="Browse central and state govt job notifications with location context." />
            <StateGrid items={states} />
          </div>
        </div>
      </Band>

      <Band tone="cool">
        <SectionHeading eyebrow="Plans" title="Start free. Upgrade when matching saves you time." align="center" />
        <div className="grid gap-4 lg:grid-cols-4">
          <PricingCard title="Free" price="₹0" body="Browse notifications and run basic matching." features={["One profile", "Basic match status", "Save up to 3 notifications"]} actionHref="/signup" actionLabel="Start free" />
          <PricingCard title="Founding Pro Pass" price="₹49" body="3 months of Pro access. One-time payment. No automatic renewal." features={["Limited founding offer", "Full explanations", "Unlimited saved notifications"]} featured actionHref="/checkout/founding" actionLabel="Claim Founding Pass" />
          <PricingCard title="Pro" price="₹99/mo" body="For active aspirants tracking multiple notifications." features={["Daily digest", "Deadline reminders", "Ad-free logged-in experience"]} actionHref="/checkout/pro-monthly" actionLabel="Choose Pro" />
          <PricingCard title="Pro Plus" price="Coming soon" body="For families and advanced alerting when enabled." features={["Up to 3 profiles", "WhatsApp when configured", "Detailed reports"]} actionHref="/dashboard/family" actionLabel="Preview Pro Plus" />
        </div>
      </Band>

      <Band>
        <SectionHeading eyebrow="Questions" title="What candidates ask before trusting a notification-matching platform" />
        <div className="grid gap-3 lg:grid-cols-2">
          {[
            "Is SarkariMatch a government website?",
            "Does SarkariMatch guarantee eligibility?",
            "How does eligibility matching work?",
            "Are application links official?",
            "What happens after my Founding Pass expires?",
            "Can I cancel a monthly plan?",
            "What is included in Pro Plus?"
          ].map((q) => (
            <details key={q} className="rounded-2xl border border-[color:var(--border)] bg-white p-4 shadow-soft">
              <summary className="cursor-pointer font-black text-primary">{q}</summary>
              <p className="mt-3 text-sm leading-6 text-muted">SarkariMatch provides verified information and rule-based guidance. Always verify the official notification before applying.</p>
            </details>
          ))}
        </div>
      </Band>

      <section className="px-4 pb-12">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift sm:p-10">
          <BadgeCheck className="text-[#B9F8CD]" size={34} aria-hidden="true" />
          <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Ready to see which notifications fit your profile?</h2>
          <p className="mt-3 max-w-2xl text-white/75">Start with basic eligibility. You can improve your profile over time.</p>
          <ButtonLink href="/eligibility" variant="secondary" className="mt-6 bg-white text-primary">Find My Matches</ButtonLink>
        </div>
      </section>
    </div>
  );
}

function ProofCards() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        ["Post-level", "eligibility rules"],
        ["Official", "application links"],
        ["Mobile-first", "matching flow"],
        ["No fake", "offer counters"]
      ].map(([top, bottom]) => (
        <div key={top} className="rounded-2xl bg-surface px-2.5 py-3 text-center shadow-soft">
          <p className="text-sm font-black text-primary sm:text-base">{top}</p>
          <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-muted">{bottom}</p>
        </div>
      ))}
    </div>
  );
}

function Band({ children, tone = "warm" }: { children: React.ReactNode; tone?: "warm" | "cool" | "split" }) {
  const className = tone === "cool" ? "bg-surface" : tone === "split" ? "bg-[linear-gradient(90deg,#EAFBF0_0%,#EAFBF0_50%,#E8F8FA_50%,#E8F8FA_100%)]" : "bg-[rgba(250,250,247,0.72)]";
  return (
    <section className={className}>
      <div className="mx-auto max-w-7xl px-4 py-11 sm:py-14">{children}</div>
    </section>
  );
}

const departmentLabels: Record<string, string> = {
  ssc: "SSC",
  upsc: "UPSC",
  psu: "PSU",
  railways: "Railways",
  banking: "Banking",
  defence: "Defence",
  police: "Police",
  teaching: "Teaching",
  engineering: "Engineering",
  healthcare: "Healthcare"
};

function DepartmentGrid({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => (
        <Link key={item} href={`/jobs/department/${item}` as Route} className="group rounded-2xl border border-[color:var(--border)] bg-white p-4 font-black text-primary shadow-soft transition hover:-translate-y-1 hover:border-[color:var(--brand-green)]">
          <span className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-mint text-success"><Building2 size={19} aria-hidden="true" /></span>
          {departmentLabels[item] ?? titleCase(item)}
          <ArrowRight className="mt-3 text-muted transition group-hover:translate-x-1 group-hover:text-primary" size={16} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}

function StateGrid({ items }: { items: string[] }) {
  return (
    <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-white p-4 shadow-soft">
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => (
          <Link
            key={item}
            href={`/jobs/state/${item}` as Route}
            className={`group flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm font-black text-primary transition hover:-translate-y-0.5 hover:border-[color:var(--brand-green)] hover:bg-mint ${index === 0 ? "border-[rgba(24,185,67,0.28)] bg-mint" : "border-[color:var(--border)] bg-surface"}`}
          >
            <span className="flex items-center gap-2">
              <MapPinned size={16} className="text-success" aria-hidden="true" />
              {titleCase(item)}
            </span>
            <ArrowRight className="shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-primary" size={15} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function titleCase(slug: string) {
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
