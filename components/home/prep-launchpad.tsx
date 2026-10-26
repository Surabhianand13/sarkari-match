import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { MockDemo } from "@/components/home/mock-demo";
import { T } from "@/components/i18n/t";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { examFamilies } from "@/lib/exams/directory";
import { trust } from "@/lib/trust";

// Light "start here" section: exam chips, two clear actions, the headline numbers as a stats strip, and a self-playing mock test.
export function PrepLaunchpad({ seriesPath }: { seriesPath: string }) {
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
          <dl className="mt-9 grid grid-cols-2 overflow-hidden rounded-3xl border border-border bg-white/80 shadow-soft backdrop-blur sm:grid-cols-4 sm:divide-x sm:divide-border" aria-label="Platform numbers">
            {trust.stats.map((stat, i) => (
              <div key={stat.label} className={`px-4 py-4 text-center sm:px-3 ${i % 2 === 0 ? "border-r border-border sm:border-r-0" : ""} ${i < 2 ? "border-b border-border sm:border-b-0" : ""}`}>
                <dd className="text-2xl font-black leading-none tracking-tight text-primary sm:text-[1.65rem]"><CountUp value={stat.count} suffix={stat.suffix} label={stat.label} /></dd>
                <dt className="mt-1.5 text-[0.7rem] font-black uppercase tracking-[0.12em] text-muted">{stat.label}</dt>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center border-t border-border px-4 py-4 text-center sm:border-t-0 sm:px-3">
              <dd className="flex items-center gap-1.5 text-2xl font-black leading-none text-success sm:text-[1.65rem]"><ShieldCheck size={24} aria-hidden="true" /> AI</dd>
              <dt className="mt-1.5 text-[0.7rem] font-black uppercase tracking-[0.12em] text-muted">checked questions</dt>
            </div>
          </dl>
        </Reveal>
        <Reveal delay={150}><MockDemo /></Reveal>
      </div>
    </section>
  );
}
