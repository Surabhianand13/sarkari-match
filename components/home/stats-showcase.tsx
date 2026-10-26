import { ClipboardCheck, Library, Users } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { trust } from "@/lib/trust";

const icons = [Users, Library, ClipboardCheck];
const notes = ["Preparing for govt exams with us", "Practice and mock test questions to learn from", "Full-length and sectional tests"];

// Animated numbers on glass cards. The figures come from lib/trust.ts, where the business keeps its claims.
export function StatsShowcase() {
  if (!trust.stats.length) return null;
  return (
    <section className="relative isolate overflow-hidden bg-[linear-gradient(135deg,#050F26,#0B2D63_50%,#0D6E6E)] text-white" aria-label="Platform numbers">
      <div className="dot-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div className="pointer-events-none absolute -left-20 top-0 -z-10 size-80 rounded-full bg-brand-green/25 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-24 bottom-0 -z-10 size-96 rounded-full bg-teal/30 blur-3xl animate-float" />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <Reveal className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#B9F8CD]">Learning at scale</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-black tracking-tight sm:text-4xl">A whole prep platform, built for govt exam aspirants</h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {trust.stats.map((stat, i) => {
            const Icon = icons[i % icons.length];
            return (
              <Reveal key={stat.label} delay={i * 120}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-white/30 hover:bg-white/15">
                  <div className="sheen pointer-events-none absolute inset-0 overflow-hidden rounded-3xl opacity-0 transition group-hover:opacity-100" />
                  <div className="relative flex size-20 items-center justify-center">
                    <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.2" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#32D66B" strokeWidth="2.2" strokeLinecap="round" pathLength="100" className="ring-draw" style={{ animationDelay: `${i * 200}ms` }} />
                    </svg>
                    <span className="orbit-dot absolute left-1/2 top-1/2 -ml-1 -mt-1 size-2 rounded-full bg-[#B9F8CD]" style={{ ["--orbit" as string]: "40px", animationDelay: `${i * -2}s` }} aria-hidden="true" />
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#18B943,#0D9488)] shadow-green"><Icon size={24} aria-hidden="true" /></span>
                  </div>
                  <p className="mt-5 text-5xl font-black tracking-tight sm:text-6xl"><CountUp value={stat.count} suffix={stat.suffix} label={stat.label} /></p>
                  <p className="mt-1 text-sm font-black uppercase tracking-[0.14em] text-[#B9F8CD]">{stat.label}</p>
                  <p className="mt-3 text-sm font-medium leading-6 text-white/65">{notes[i % notes.length]}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
