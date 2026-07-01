import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/design-system";
import { qualificationLabels, qualificationPages } from "@/lib/data/catalog";

const descriptions: Record<string, string> = {
  "8th-pass": "Entry-level notifications with basic education rules.",
  "10th-pass": "Matric-level notifications and exams.",
  "12th-pass": "Higher-secondary notifications, clerical posts and trainee exams.",
  iti: "Trade-based notifications where ITI certification matters.",
  diploma: "Technical diploma notifications and junior engineer paths.",
  graduate: "Broadest eligibility pool across central and state notifications.",
  btech: "Engineering notifications for B.Tech/B.E candidates.",
  postgraduate: "Specialist notifications for MBA, MSc, MCom, MS and more.",
  nursing: "Healthcare and nursing notifications.",
  teaching: "Teaching, school, college and education department notifications.",
  law: "Legal, judicial assistant and law qualification notifications."
};

export default function QualificationHubPage() {
  return (
    <div className="bg-surface">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionHeading
            eyebrow="Qualification-wise notifications"
            title="Browse Govt Job Notifications by Qualification"
            body="Start with the qualification the candidate already has. SarkariMatch then helps narrow the notification by age, category, state and post-level rules."
          />
          <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-white p-5 shadow-soft">
            <ShieldCheck className="text-success" size={24} aria-hidden="true" />
            <p className="mt-3 text-xl font-black text-primary">Designed for eligibility matching</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Qualification is only the first gate. The next step is checking notification-specific age limits, relaxations and application rules.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {qualificationPages.map((slug) => (
            <Link key={slug} href={`/jobs/qualification/${slug}`} className="group min-h-36 rounded-3xl border border-[color:var(--border)] bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-[color:var(--brand-green)] hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success">
                  <GraduationCap size={21} aria-hidden="true" />
                </span>
                <ArrowRight className="text-muted transition group-hover:translate-x-1 group-hover:text-primary" size={18} aria-hidden="true" />
              </div>
              <p className="mt-4 text-lg font-black text-primary">{qualificationLabels[slug]}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-muted">{descriptions[slug]}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
