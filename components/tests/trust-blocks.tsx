import { BadgeCheck, Bot, PenLine, ShieldCheck, Star } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { trust } from "@/lib/trust";
import { getExamPattern } from "@/lib/exams/pattern";

export function TrustBadges({ className = "" }: { className?: string }) {
  const icons = [PenLine, Bot, ShieldCheck];
  return (
    <ul className={`grid gap-2 sm:grid-cols-3 ${className}`}>
      {trust.claims.map((claim, index) => {
        const Icon = icons[index] ?? BadgeCheck;
        return (
          <li key={claim} className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2.5 text-sm font-bold leading-5 text-primary shadow-soft">
            <Icon className="mt-0.5 shrink-0 text-brand-green" size={18} aria-hidden="true" />
            {claim}
          </li>
        );
      })}
    </ul>
  );
}

export function StatsBand() {
  if (!trust.stats.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {trust.stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl bg-white px-5 py-4 shadow-soft">
          <p className="text-3xl font-black text-primary sm:text-4xl"><CountUp value={stat.count} suffix={stat.suffix} label={stat.label} /></p>
          <p className="mt-1 text-sm font-bold text-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ProcessSteps() {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {trust.process.map((step, index) => (
        <li key={step.title} className="rounded-3xl border border-border bg-white p-5 shadow-soft">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-black text-white">{index + 1}</span>
          <h3 className="mt-3 text-lg font-black text-primary">{step.title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function ReviewsSection() {
  if (!trust.reviews.length) return null;
  return (
    <section aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-2xl font-black tracking-tight text-primary sm:text-3xl">What learners say</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {trust.reviews.map((review) => (
          <figure key={`${review.name}-${review.text.slice(0, 20)}`} className="rounded-3xl border border-border bg-white p-5 shadow-soft">
            <div className="flex gap-0.5 text-amber" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="currentColor" />)}</div>
            <blockquote className="mt-3 text-sm leading-6 text-foreground">“{review.text}”</blockquote>
            <figcaption className="mt-3 text-sm font-black text-primary">
              {review.name}
              <span className="block text-xs font-semibold text-muted">{[review.exam, review.city, review.result].filter(Boolean).join(" · ")}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function ExpertsSection() {
  if (!trust.experts.length) return null;
  return (
    <section aria-labelledby="experts-heading">
      <h2 id="experts-heading" className="text-2xl font-black tracking-tight text-primary sm:text-3xl">Our experts</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {trust.experts.map((expert) => (
          <div key={expert.name} className="rounded-3xl border border-border bg-white p-5 shadow-soft">
            <p className="text-lg font-black text-primary">{expert.name}</p>
            <p className="text-sm font-bold text-success">{expert.role} · {expert.experience}</p>
            {expert.bio && <p className="mt-2 text-sm leading-6 text-muted">{expert.bio}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export async function PatternTable({ examSlug }: { examSlug: string }) {
  const pattern = await getExamPattern(examSlug);
  if (!pattern) return null;
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-soft">
      <table className="w-full text-left text-sm">
        <caption className="px-5 pt-4 text-left text-lg font-black text-primary">{pattern.name} exam pattern</caption>
        <thead className="text-xs font-black uppercase tracking-wide text-muted">
          <tr><th className="px-5 py-3">Section</th><th className="px-5 py-3">Questions</th><th className="px-5 py-3">Marks</th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pattern.sections.map((section) => (
            <tr key={section.name}><td className="px-5 py-3 font-bold text-primary">{section.name}</td><td className="px-5 py-3">{section.questions}</td><td className="px-5 py-3">{section.marks}</td></tr>
          ))}
          <tr className="bg-surface font-black text-primary"><td className="px-5 py-3">Total</td><td className="px-5 py-3">{pattern.questions}</td><td className="px-5 py-3">{pattern.maxMarks}</td></tr>
        </tbody>
      </table>
      <p className="px-5 py-3 text-xs font-semibold text-muted">{pattern.minutes} minutes. {pattern.marksPerQuestion} marks per question, {pattern.negativeMarks} negative marks for each wrong answer. Always check the latest official notification for any change.</p>
    </div>
  );
}
