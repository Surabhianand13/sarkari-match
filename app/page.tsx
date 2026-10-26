import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BarChart3, BookOpenCheck, ClipboardCheck, ListChecks, Smartphone } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { ButtonLink } from "@/components/design-system";
import { BannerCarousel } from "@/components/home/banner-carousel";
import { HeroDemo } from "@/components/home/hero-demo";
import { TestPreview } from "@/components/home/test-preview";
import { T } from "@/components/i18n/t";
import { JsonLd } from "@/components/seo/json-ld";
import { ExpertsSection, PatternTable, ProcessSteps, ReviewsSection, StatsBand, TrustBadges } from "@/components/tests/trust-blocks";
import { getBanners } from "@/lib/banners";
import { getJobs } from "@/lib/data/jobs";
import { examFamilies } from "@/lib/exams/directory";
import { testSeriesFaq } from "@/lib/faq";
import { brand } from "@/lib/brand";
import { buildMetadata, faqJsonLd, organizationJsonLd, productJsonLd, websiteJsonLd } from "@/lib/seo";
import { discountPercent, formatPrice, getPublishedSeries } from "@/lib/tests/catalog";

export const revalidate = 300;

export const metadata = {
  ...buildMetadata({
    title: `${brand.fullName}: SSC CGL Mock Test Series by Experts, Checked by AI`,
    description: brand.shortDescription,
    path: "/"
  }),
  title: { absolute: `${brand.fullName}: SSC CGL Mock Test Series by Experts, Checked by AI` }
};

export default async function HomePage() {
  const [series, jobs, banners] = await Promise.all([getPublishedSeries(), getJobs(), getBanners(true)]);
  const featured = series.find((item) => item.examSlug === "ssc-cgl") ?? series[0] ?? null;
  const seriesPath = featured ? `/tests/${featured.examSlug}/${featured.slug}` : "/tests";
  const discount = featured ? discountPercent(featured.pricePaise, featured.mrpPaise) : 0;

  return (
    <div className="overflow-hidden">
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          faqJsonLd(testSeriesFaq),
          ...(featured ? [productJsonLd({ name: featured.title, description: `${featured.title}: mock tests that follow the real exam pattern, with solutions and analysis.`, path: seriesPath, pricePaise: featured.pricePaise, mrpPaise: featured.mrpPaise })] : [])
        ]}
      />

      {banners.length > 0 ? (
        <>
          <BannerCarousel banners={banners} />
          <section className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 lg:flex-row lg:items-center lg:justify-between">
            {featured && (
              <p className="flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-3xl font-black text-primary">{formatPrice(featured.pricePaise)}</span>
                {featured.mrpPaise && featured.mrpPaise > featured.pricePaise && <span className="pb-0.5 text-base font-bold text-muted line-through">{formatPrice(featured.mrpPaise)}</span>}
                <span className="pb-0.5 text-sm font-bold text-muted">{featured.title} · {featured.testCount} tests · one-time</span>
              </p>
            )}
            <div className="flex flex-col gap-3 min-[420px]:flex-row">
              <ButtonLink href={seriesPath}><T k="cta_view_series" /> <ArrowRight size={17} aria-hidden="true" /></ButtonLink>
              <ButtonLink href="/tests" variant="secondary"><T k="cta_free_sample" /></ButtonLink>
            </div>
          </section>
          <section className="mx-auto max-w-7xl px-4 pb-6"><TrustBadges /></section>
        </>
      ) : (
      <section className="relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(24,185,67,0.14),transparent_26rem),radial-gradient(circle_at_90%_10%,rgba(99,102,241,0.10),transparent_22rem)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
          <div>
            <p className="inline-flex rounded-full border border-[rgba(24,185,67,0.22)] bg-mint px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-success"><T k="hero_eyebrow" /></p>
            <h1 className="mt-5 max-w-xl text-balance text-[2.1rem] font-black leading-[1.08] tracking-tight text-primary sm:text-5xl lg:text-6xl"><T k="hero_title" /></h1>
            <p className="mt-5 max-w-xl text-pretty text-base font-medium leading-7 text-muted sm:text-lg sm:leading-8"><T k="hero_subtitle" /></p>
            {featured && (
              <p className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-4xl font-black text-primary">{formatPrice(featured.pricePaise)}</span>
                {featured.mrpPaise && featured.mrpPaise > featured.pricePaise && <span className="pb-1 text-lg font-bold text-muted line-through">{formatPrice(featured.mrpPaise)}</span>}
                {discount > 0 && <span className="mb-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-black text-success">{discount}% off</span>}
                <span className="pb-1 text-sm font-bold text-muted">one-time · {featured.testCount} tests · {featured.questionCount} questions</span>
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row">
              <ButtonLink href={seriesPath} className="w-full min-[420px]:w-auto"><T k="cta_view_series" /> <ArrowRight size={17} aria-hidden="true" /></ButtonLink>
              <ButtonLink href="/tests" variant="secondary" className="w-full min-[420px]:w-auto"><T k="cta_free_sample" /></ButtonLink>
            </div>
            <TrustBadges className="mt-7" />
          </div>
          <TestPreview />
        </div>
      </section>
      )}

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12">
          <StatsBand />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12 sm:pt-16">
        <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">Choose your exam</h2>
        <p className="mt-3 max-w-2xl text-muted">Mock tests and a question bank for each exam family. SSC CGL is open now; the rest are on the way.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {examFamilies.map((family) => {
            const live = family.exams[0];
            const body = (
              <>
                <p className="text-lg font-black text-primary">{family.name}</p>
                {live ? <p className="mt-2 text-sm font-black text-success">{live.name} mock tests <ArrowRight size={14} className="inline" aria-hidden="true" /></p> : <p className="mt-2 inline-flex rounded-full bg-surface px-2.5 py-1 text-xs font-black uppercase tracking-wide text-muted">Coming soon</p>}
              </>
            );
            return live ? (
              <Link key={family.name} href={live.href as Route} className="rounded-3xl border border-[rgba(24,185,67,0.35)] bg-mint p-5 shadow-soft transition hover:-translate-y-0.5">{body}</Link>
            ) : (
              <div key={family.name} className="rounded-3xl border border-border bg-white p-5 opacity-80">{body}</div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">What you get with the series</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [ClipboardCheck, "Real exam pattern", "Timed full-length mocks with the same sections, marking and negative marking as the exam."],
            [BookOpenCheck, "Solution for every question", "Step-by-step explanations after you submit, so each mistake becomes a lesson."],
            [BarChart3, "Analysis that shows what to fix", "Score, accuracy, section-wise and topic-wise results, with your weakest topics first."],
            [Smartphone, "Practice anywhere", "Works on mobile and desktop. Your answers are saved as you go."]
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof ListChecks;
            return (
              <div key={title as string} className="rounded-3xl border border-border bg-white p-5 shadow-soft">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success"><I size={22} aria-hidden="true" /></span>
                <h3 className="mt-3 text-lg font-black text-primary">{title as string}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{body as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">Built on the official SSC CGL pattern</h2>
            <p className="mt-3 max-w-lg text-muted">Every full-length mock follows the exam&apos;s sections, marks and timing, so test day feels familiar.</p>
          </div>
          <PatternTable examSlug="ssc-cgl" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">How every question is made</h2>
        <p className="mt-3 max-w-2xl text-muted">Quality is the whole point. No question reaches a test without all three steps.</p>
        <div className="mt-6"><ProcessSteps /></div>
        <div className="mt-12"><ExpertsSection /></div>
        <div className="mt-12"><ReviewsSection /></div>
      </section>

      {featured && (
        <section className="bg-[linear-gradient(135deg,#0B2D63,#0D9488)] text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{featured.title}</h2>
              <p className="mt-3 max-w-xl text-white/80">{featured.testCount} tests, {featured.questionCount} questions, solutions and analysis. Pay once, no renewal. Take the free sample test first and see the quality yourself.</p>
            </div>
            <div className="flex flex-col gap-3 min-[420px]:flex-row">
              <Link href={seriesPath as Route} className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-primary">View the series · {formatPrice(featured.pricePaise)}</Link>
              <Link href="/tests" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-6 text-sm font-black text-white">Free sample test</Link>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-success">Free with every account</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-4xl">Govt exam &amp; job notifications matched to your eligibility</h2>
            <p className="mt-3 max-w-xl text-muted">Enter your age, qualification and category once. We check them against the published rules and show only the notifications you can apply for, with official links.</p>
            <div className="mt-5 flex flex-col gap-3 min-[420px]:flex-row">
              <ButtonLink href="/eligibility">Check my eligibility</ButtonLink>
              <ButtonLink href="/jobs" variant="secondary">Browse notifications</ButtonLink>
            </div>
          </div>
          <HeroDemo />
        </div>
        {jobs.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-4 text-xl font-black text-primary">Latest notifications</h3>
            <div className="grid gap-4 lg:grid-cols-2">{jobs.slice(0, 4).map((job, index) => <JobCard key={job.id} job={job} index={index} />)}</div>
            <div className="mt-5"><ButtonLink href="/jobs" variant="secondary">View all notifications</ButtonLink></div>
          </div>
        )}
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">Questions before you start</h2>
          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            {testSeriesFaq.map((item) => (
              <details key={item.question} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                <summary className="cursor-pointer font-black text-primary">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift sm:p-10">
          <h2 className="max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Start with the free sample test</h2>
          <p className="mt-3 max-w-2xl text-white/75">Create a free account, take a full sample test in the real exam window, and see your score with solutions.</p>
          <ButtonLink href="/tests" variant="secondary" className="mt-6 bg-white text-primary">Try the free sample test</ButtonLink>
        </div>
      </section>
    </div>
  );
}
