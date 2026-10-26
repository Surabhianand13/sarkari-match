import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MockDemo } from "@/components/home/mock-demo";
import { T } from "@/components/i18n/t";
import { Reveal } from "@/components/motion/reveal";
import { examFamilies } from "@/lib/exams/directory";
import { formatPrice } from "@/lib/tests/catalog";
import { trust } from "@/lib/trust";

type Featured = { title: string; pricePaise: number; testCount: number } | null;

// Light "start here" section: exam chips, two clear actions, the headline numbers as a dotted row, and a self-playing mock test.
export function PrepLaunchpad({ featured, seriesPath }: { featured: Featured; seriesPath: string }) {
  const chips: Array<{ name: string; href?: string }> = examFamilies.slice(0, 6).flatMap((family) =>
    family.exams.length ? family.exams.map((exam) => ({ name: exam.name, href: exam.href })) : [{ name: family.name.replace(" Exams", "") }]
  );
  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#FFFFFF,#EFF9F3_55%,#FFFFFF)]">
      <div className="pointer-events-none absolute -left-24 top-8 -z-10 size-80 rounded-full bg-brand-green/15 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-24 bottom-0 -z-10 size-96 rounded-full bg-teal/15 blur-3xl animate-float" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-[rgba(24,185,67,0.25)] bg-white px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-success shadow-soft">
            <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-brand-green/60" /><span className="relative size-2 rounded-full bg-brand-green" /></span>
            Start in under a minute
          </p>
          <h2 className="mt-5 max-w-xl text-balance text-4xl font-black leading-[1.08] tracking-tight text-primary sm:text-5xl">
            Pick your exam. Practise the way you will be <span className="bg-[linear-gradient(135deg,#18B943,#0D9488)] bg-clip-text text-transparent">tested</span>.
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="Exams">
            {chips.map((chip) => (
              <li key={chip.name}>
                {chip.href ? (
                  <Link href={chip.href as never} className="inline-flex rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-4 py-2 text-sm font-black text-white shadow-green transition hover:-translate-y-0.5">{chip.name}</Link>
                ) : (
                  <span className="inline-flex rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-muted">{chip.name}<span className="ml-2 text-[0.62rem] font-black uppercase tracking-wide opacity-70">soon</span></span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-3 min-[460px]:flex-row">
            <Link href={seriesPath as never} className="sheen relative inline-flex min-h-14 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#18B943,#0D9488)] px-7 text-base font-black text-white shadow-green transition hover:-translate-y-0.5">
              <T k="cta_free_sample" /> <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/practice" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-7 text-base font-black text-primary shadow-soft transition hover:-translate-y-0.5 hover:border-primary">
              Start practising
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3" aria-label="Platform numbers">
            {trust.stats.map((stat) => (
              <li key={stat.label} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full bg-brand-green shadow-[0_0_0_4px_rgba(24,185,67,0.18)]" aria-hidden="true" />
                <span className="font-black text-primary">{stat.value}</span>
                <span className="font-semibold text-muted">{stat.label}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm">
              <span className="size-2.5 rounded-full bg-brand-green shadow-[0_0_0_4px_rgba(24,185,67,0.18)]" aria-hidden="true" />
              <span className="font-black text-primary">AI</span>
              <span className="font-semibold text-muted">checked questions</span>
            </li>
          </ul>
          {featured && (
            <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-muted">
              <CheckCircle2 size={17} className="text-brand-green" aria-hidden="true" />
              {featured.title} from <span className="font-black text-primary">{formatPrice(featured.pricePaise)}</span> one-time. Free sample test included, no auto-renewal.
            </p>
          )}
        </Reveal>
        <Reveal delay={150}><MockDemo /></Reveal>
      </div>
    </section>
  );
}
