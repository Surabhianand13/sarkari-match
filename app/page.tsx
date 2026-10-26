import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BookOpenCheck, CheckCircle2, ClipboardCheck, Headphones, MessageCircle, Smartphone, Target } from "lucide-react";
import { ButtonLink } from "@/components/design-system";
import { BannerCarousel } from "@/components/home/banner-carousel";
import { AdaptiveVisual, InsightsVisual, PlanVisual } from "@/components/home/feature-visuals";
import { FeatureRow } from "@/components/home/feature-row";
import { Hero } from "@/components/home/hero";
import { HeroDemo } from "@/components/home/hero-demo";
import { Marquee } from "@/components/home/marquee";
import { PrepLaunchpad } from "@/components/home/prep-launchpad";
import { NotificationTile } from "@/components/home/notification-tile";
import { StatsShowcase } from "@/components/home/stats-showcase";
import { T } from "@/components/i18n/t";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { ExpertsSection, PatternTable, ProcessSteps, ReviewsSection, TrustBadges } from "@/components/tests/trust-blocks";
import { assistantEnabled } from "@/lib/assistant";
import { getBanners } from "@/lib/banners";
import { formatDate, getPublishedPosts, readingMinutes } from "@/lib/blog";
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
  const [series, jobs, banners, posts] = await Promise.all([getPublishedSeries(), getJobs(), getBanners(true), getPublishedPosts(3)]);
  const featured = series.find((item) => item.examSlug === "ssc-cgl") ?? series[0] ?? null;
  const seriesPath = featured ? `/tests/${featured.examSlug}/${featured.slug}` : "/tests";
  const discount = featured ? discountPercent(featured.pricePaise, featured.mrpPaise) : 0;
  const chips = examFamilies.slice(0, 6).flatMap((family) => (family.exams.length ? family.exams.map((exam) => ({ name: exam.name, href: exam.href })) : [{ name: family.name.replace(" Exams", "") }]));
  const aiSupport = assistantEnabled();
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "") || null;

  const smallFeatures = [
    { Icon: ClipboardCheck, title: "Real exam window", body: "Timed like the real paper, with section tabs, a question palette and mark for review." },
    { Icon: Target, title: "Free diagnostic", body: "Start with the free sample test. Your result shows where you stand, section by section." },
    { Icon: BookOpenCheck, title: "Every solution explained", body: "A step-by-step solution for every question, unlocked when you submit." },
    aiSupport
      ? { Icon: Headphones, title: "AI help, any time", body: "Ask the assistant about the series, practice or exam pattern at any hour. Payments and account issues go to a person." }
      : { Icon: Smartphone, title: "Practise anywhere", body: "Works on mobile and desktop. Your answers are saved as you go." }
  ];

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
        <BannerCarousel banners={banners} />
      ) : (
        <>
          <Hero featured={featured} seriesPath={seriesPath} chips={chips} />
          <section className="mx-auto max-w-7xl px-4 py-6"><TrustBadges /></section>
        </>
      )}

      <Marquee />

      <PrepLaunchpad featured={featured} seriesPath={seriesPath} />

      <section className="mx-auto max-w-7xl px-4 pt-14 sm:pt-20">
        <Reveal>
          <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">Choose your exam</h2>
          <p className="mt-3 max-w-2xl text-muted">Mock tests and practice questions for each exam family. SSC CGL is open now; the rest are on the way.</p>
        </Reveal>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {examFamilies.map((family, i) => {
            const live = family.exams[0];
            const inner = (
              <>
                <p className="text-lg font-black text-primary">{family.name}</p>
                {live ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-muted">{featured ? `${featured.testCount} tests · ${featured.questionCount} questions` : "Mock tests"}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm font-black text-success">{live.name} mock tests <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" /></p>
                  </>
                ) : <p className="mt-3 inline-flex rounded-full bg-surface px-2.5 py-1 text-xs font-black uppercase tracking-wide text-muted">Coming soon</p>}
              </>
            );
            return (
              <Reveal key={family.name} delay={i * 70}>
                {live ? <Link href={live.href as Route} className="group block h-full rounded-3xl border border-[rgba(24,185,67,0.35)] bg-mint p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">{inner}</Link> : <div className="h-full rounded-3xl border border-border bg-white p-5 opacity-80">{inner}</div>}
              </Reveal>
            );
          })}
        </div>
      </section>

      {featured && banners.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-12">
          <Reveal>
            <div className="rounded-3xl border border-border bg-white p-5 shadow-soft sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <span className="text-4xl font-black text-primary">{formatPrice(featured.pricePaise)}</span>
                  {featured.mrpPaise && featured.mrpPaise > featured.pricePaise && <span className="pb-1 text-lg font-bold text-muted line-through">{formatPrice(featured.mrpPaise)}</span>}
                  <span className="pb-1 text-sm font-bold text-muted">{featured.title} · {featured.testCount} tests · one-time</span>
                </p>
                <div className="flex flex-col gap-3 min-[420px]:flex-row">
                  <ButtonLink href={seriesPath}><T k="cta_view_series" /> <ArrowRight size={17} aria-hidden="true" /></ButtonLink>
                  <ButtonLink href="/tests" variant="secondary"><T k="cta_free_sample" /></ButtonLink>
                </div>
              </div>
              <TrustBadges className="mt-5" />
            </div>
          </Reveal>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <Reveal>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-success">Learn smarter</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-primary sm:text-4xl">Practice that adapts, a plan that updates, progress you can see</h2>
        </Reveal>
        <div className="mt-12 grid gap-16 sm:gap-24">
          <FeatureRow eyebrow="Adaptive practice" title="Questions that grow with you" body="Practise ten questions at a time with an instant solution after every answer. The difficulty adjusts to your accuracy, so you stay challenged without being overwhelmed." bullets={["Starts at beginner for every subject", "Score 70% or more in three sessions in a row to level up", "Pick a whole subject or a single topic"]} href="/practice" cta="Start practising" visual={<AdaptiveVisual />} />
          <FeatureRow flip eyebrow="Personalised study plan" title="A 7-day plan from your own results" body="Your weakest topics come first. The plan updates from your tests and practice, so you always know what to study next." bullets={["Built from your accuracy by topic", "Practice, a full mock and a review day every week", "No guessing what to do tomorrow"]} href="/dashboard/progress" cta="See my plan" visual={<PlanVisual />} />
          <FeatureRow eyebrow="Progress and insights" title="Know exactly where marks are lost" body="An activity calendar, score trend across your mock tests, subject accuracy and the topics that need work, all in one screen." bullets={["Mock test score trend", "Accuracy by subject and topic", "Day streak and activity calendar"]} href="/dashboard/progress" cta="View insights" visual={<InsightsVisual />} />
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {smallFeatures.map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="h-full rounded-3xl border border-border bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="mt-3 text-lg font-black text-primary">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <StatsShowcase />

      <section className="bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">Built on the official SSC CGL pattern</h2>
            <p className="mt-3 max-w-lg text-muted">Every full-length mock follows the exam&apos;s sections, marks and timing, so test day feels familiar.</p>
          </Reveal>
          <Reveal delay={100}><PatternTable examSlug="ssc-cgl" /></Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <Reveal>
          <h2 className="text-3xl font-black tracking-tight text-primary sm:text-4xl">How every question is made</h2>
          <p className="mt-3 max-w-2xl text-muted">Quality is the whole point. No question reaches a test without all three steps.</p>
        </Reveal>
        <div className="mt-7"><ProcessSteps /></div>
        <div className="mt-12"><ExpertsSection /></div>
        <div className="mt-12"><ReviewsSection /></div>
      </section>

      {featured && (
        <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#0B2D63,#0D9488)] text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 -z-10 size-72 rounded-full bg-white/10 blur-2xl animate-float-slow" />
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-14 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{featured.title}</h2>
              <p className="mt-3 max-w-xl text-white/80">{featured.testCount} tests, {featured.questionCount} questions, solutions and analysis. Pay once, no renewal. Take the free sample test first and see the quality yourself.</p>
              <p className="mt-4 flex items-end gap-3"><span className="text-4xl font-black">{formatPrice(featured.pricePaise)}</span>{featured.mrpPaise && featured.mrpPaise > featured.pricePaise && <span className="pb-1 text-lg font-bold text-white/60 line-through">{formatPrice(featured.mrpPaise)}</span>}{discount > 0 && <span className="mb-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-black">{discount}% off</span>}</p>
            </div>
            <div className="flex flex-col gap-3 min-[420px]:flex-row">
              <Link href={seriesPath as Route} className="sheen relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-full bg-white px-6 text-sm font-black text-primary">View the series</Link>
              <Link href="/tests" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-6 text-sm font-black text-white">Free sample test</Link>
            </div>
          </div>
        </section>
      )}

      <section className="px-4 py-14 sm:py-20">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[rgba(24,185,67,0.2)] bg-[linear-gradient(135deg,#F0FBF4,#FFFFFF_55%,#EEF4FF)] p-6 shadow-soft sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 -z-10 size-72 rounded-full bg-brand-green/15 blur-3xl animate-float-slow" />
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <Reveal>
              <p className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-success shadow-soft">Free with every account</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-primary sm:text-4xl">Govt exam &amp; job notifications matched to your eligibility</h2>
              <p className="mt-3 max-w-xl text-muted">Enter your age, qualification and category once. We check them against the published rules and show only the notifications you can apply for.</p>
              <ul className="mt-5 grid gap-2.5">
                {["Checks age, qualification, category and domicile", "Shows only what you can apply for", "Every notification links to the official source"].map((point) => (
                  <li key={point} className="flex items-center gap-2.5 text-sm font-bold text-primary"><CheckCircle2 size={18} className="shrink-0 text-brand-green" aria-hidden="true" />{point}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row">
                <ButtonLink href="/eligibility">Check my eligibility</ButtonLink>
                <ButtonLink href="/jobs" variant="secondary">Browse notifications</ButtonLink>
              </div>
            </Reveal>
            <Reveal delay={120}><div className="animate-float-slow"><HeroDemo /></div></Reveal>
          </div>
          {jobs.length > 0 && (
            <div className="mt-12">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h3 className="text-xl font-black text-primary sm:text-2xl">Latest notifications</h3>
                <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-black text-primary hover:underline">View all <ArrowRight size={15} aria-hidden="true" /></Link>
              </div>
              <div className="-mx-2 mt-5 flex snap-x gap-4 overflow-x-auto px-2 pb-3 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
                {jobs.slice(0, 6).map((job) => <NotificationTile key={job.id} job={job} />)}
              </div>
            </div>
          )}
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:pb-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-success">Blog</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight text-primary sm:text-4xl">Preparation guides</h2>
            </div>
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-black text-primary hover:underline">All articles <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={i * 90}>
                <Link href={`/blog/${post.slug}` as Route} className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
                  <div className="flex h-28 items-end bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-5">
                    <div className="flex flex-wrap gap-2">{post.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-black text-white backdrop-blur">{tag}</span>)}</div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-black leading-snug text-primary group-hover:underline">{post.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-muted">{post.excerpt}</p>
                    <p className="mt-4 text-xs font-bold text-muted">{formatDate(post.publishedAt)} · {readingMinutes(post.content)} min read</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-success">FAQ</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-4xl">Questions before you start</h2>
            <p className="mt-3 text-muted">Everything learners ask us first. Cannot find your answer? Talk to us.</p>
            <div className="mt-6 rounded-3xl bg-white p-5 shadow-soft">
              <p className="flex items-center gap-2 font-black text-primary"><MessageCircle size={18} className="text-success" aria-hidden="true" /> Need a hand?</p>
              <p className="mt-1 text-sm text-muted">Payments, access or anything else: we reply personally.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 text-sm font-black text-white">WhatsApp us</a>}
                <Link href="/contact" className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-black text-primary hover:bg-surface">Contact page</Link>
              </div>
            </div>
          </Reveal>
          <div className="grid content-start gap-3">
            {testSeriesFaq.map((item, i) => (
              <Reveal key={item.question} delay={i * 40}>
                <details className="group rounded-2xl border border-border bg-white p-5 shadow-soft transition open:border-[rgba(24,185,67,0.4)] open:shadow-lift">
                  <summary className="cursor-pointer list-none font-black text-primary marker:hidden"><span className="flex items-start justify-between gap-4">{item.question}<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-lg leading-none text-muted transition group-open:rotate-45 group-open:bg-mint group-open:text-success" aria-hidden="true">+</span></span></summary>
                  <p className="mt-3 text-sm leading-7 text-muted">{item.answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:py-20">
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#050F26,#0B2D63_50%,#0D6E6E)] px-6 py-12 text-center text-white shadow-lift sm:px-12 sm:py-16">
          <div className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
          <div className="pointer-events-none absolute -left-16 bottom-0 -z-10 size-72 rounded-full bg-brand-green/30 blur-3xl animate-float" />
          <div className="pointer-events-none absolute -right-16 -top-10 -z-10 size-72 rounded-full bg-teal/40 blur-3xl animate-float-slow" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B9F8CD]">Ready when you are</p>
          <h2 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-black tracking-tight sm:text-5xl">See where you stand with a free sample test</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/75">Create a free account, take a full sample test in the real exam window, and get your score with solutions and analysis.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 min-[420px]:flex-row">
            <Link href="/tests" className="sheen relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-full bg-white px-7 text-sm font-black text-primary">Try the free sample test</Link>
            <Link href="/practice" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-7 text-sm font-black text-white hover:bg-white/10">Start practising</Link>
          </div>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-bold text-white/80">
            {["No card needed to start", "Pay once, no auto-renewal", "Solutions for every question"].map((point) => <li key={point} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#7CE9A0]" aria-hidden="true" />{point}</li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}
