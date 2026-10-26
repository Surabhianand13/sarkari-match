import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

export function FeatureRow({ eyebrow, title, body, bullets, href, cta, visual, flip = false }: { eyebrow: string; title: string; body: string; bullets: string[]; href: string; cta: string; visual: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <Reveal className={flip ? "lg:order-2" : ""}>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-success">{eyebrow}</p>
        <h3 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-4xl">{title}</h3>
        <p className="mt-3 max-w-lg text-muted">{body}</p>
        <ul className="mt-5 grid gap-2">
          {bullets.map((bullet) => <li key={bullet} className="flex items-start gap-2 text-sm font-bold text-primary"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-green" />{bullet}</li>)}
        </ul>
        <Link href={href as Route} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-black text-white transition hover:-translate-y-0.5">{cta} <ArrowRight size={16} aria-hidden="true" /></Link>
      </Reveal>
      <Reveal delay={120}><div className="mx-auto w-full max-w-md">{visual}</div></Reveal>
    </div>
  );
}
