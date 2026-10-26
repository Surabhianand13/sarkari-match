import Link from "next/link";
import { ArrowRight, CalendarCheck, Gauge, TrendingUp } from "lucide-react";
import { ButtonLink } from "@/components/design-system";
import { TestPreview } from "@/components/home/test-preview";
import { T } from "@/components/i18n/t";
import { discountPercent, formatPrice } from "@/lib/tests/catalog";

type Featured = { title: string; pricePaise: number; mrpPaise: number | null; testCount: number; questionCount: number } | null;

// Text introduction shown when no banners are active. The small cards beside the test window are illustrations of the product, not live data.
export function Hero({ featured, seriesPath, chips }: { featured: Featured; seriesPath: string; chips: Array<{ name: string; href?: string }> }) {
  const discount = featured ? discountPercent(featured.pricePaise, featured.mrpPaise) : 0;
  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#071F46_0%,#0B2D63_45%,#0D6E6E_100%)] text-white">
      <div className="pointer-events-none absolute -left-24 top-10 -z-10 size-80 rounded-full bg-brand-green/25 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-20 bottom-0 -z-10 size-96 rounded-full bg-teal/30 blur-3xl animate-float" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div>
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#B9F8CD] backdrop-blur"><T k="hero_eyebrow" /></p>
          <h1 className="mt-5 max-w-xl text-balance text-[2.2rem] font-black leading-[1.07] tracking-tight sm:text-5xl lg:text-6xl"><T k="hero_title" /></h1>
          <p className="mt-5 max-w-xl text-pretty text-base font-medium leading-7 text-white/75 sm:text-lg sm:leading-8"><T k="hero_subtitle" /></p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Exams">
            {chips.map((chip) => (
              <li key={chip.name}>
                {chip.href ? <Link href={chip.href as never} className="inline-flex rounded-full bg-white px-3.5 py-1.5 text-sm font-black text-primary">{chip.name}</Link> : <span className="inline-flex rounded-full border border-white/25 px-3.5 py-1.5 text-sm font-bold text-white/70">{chip.name} <span className="ml-1.5 text-[0.65rem] uppercase tracking-wide text-white/50">soon</span></span>}
              </li>
            ))}
          </ul>
          {featured && (
            <p className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-4xl font-black">{formatPrice(featured.pricePaise)}</span>
              {featured.mrpPaise && featured.mrpPaise > featured.pricePaise && <span className="pb-1 text-lg font-bold text-white/50 line-through">{formatPrice(featured.mrpPaise)}</span>}
              {discount > 0 && <span className="mb-1.5 rounded-full bg-brand-green px-2.5 py-1 text-xs font-black text-white">{discount}% off</span>}
              <span className="pb-1 text-sm font-bold text-white/60">one-time · {featured.testCount} tests · {featured.questionCount} questions</span>
            </p>
          )}
          <div className="mt-7 flex flex-col gap-3 min-[420px]:flex-row">
            <ButtonLink href={seriesPath} className="sheen relative w-full overflow-hidden min-[420px]:w-auto"><T k="cta_view_series" /> <ArrowRight size={17} aria-hidden="true" /></ButtonLink>
            <ButtonLink href="/tests" variant="secondary" className="w-full min-[420px]:w-auto"><T k="cta_free_sample" /></ButtonLink>
          </div>
        </div>
        <div className="relative">
          <div className="animate-float-slow"><TestPreview /></div>
          <div className="animate-float absolute -left-3 -top-5 hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 text-primary shadow-lift sm:flex" aria-hidden="true">
            <span className="flex size-8 items-center justify-center rounded-xl bg-mint text-success"><TrendingUp size={16} /></span>
            <span className="text-xs font-black leading-tight">Accuracy<br /><span className="text-base">82%</span></span>
            <span className="ml-1 self-start text-[0.55rem] font-bold uppercase text-muted">sample</span>
          </div>
          <div className="animate-float-slow absolute -bottom-5 right-6 hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 text-primary shadow-lift sm:flex" aria-hidden="true">
            <span className="flex size-8 items-center justify-center rounded-xl bg-mint text-success"><Gauge size={16} /></span>
            <span className="text-xs font-black leading-tight">Level up<br /><span className="text-base">Intermediate</span></span>
          </div>
          <div className="animate-float absolute -right-3 top-1/3 hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 text-primary shadow-lift lg:flex" aria-hidden="true">
            <span className="flex size-8 items-center justify-center rounded-xl bg-mint text-success"><CalendarCheck size={16} /></span>
            <span className="text-xs font-black leading-tight">Day 3 of 7<br /><span className="text-base">Study plan</span></span>
          </div>
        </div>
      </div>
    </section>
  );
}
