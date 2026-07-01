import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Building2 } from "lucide-react";
import { SectionHeading } from "@/components/design-system";
import { departmentLabels, departments } from "@/lib/data/catalog";

const departmentDescriptions: Record<string, string> = {
  ssc: "SSC exams and central staff selection notifications.",
  upsc: "UPSC recruitment and civil services related notifications.",
  railways: "Railway boards, RRC and RRB notifications.",
  banking: "Banking, insurance and financial institution notifications.",
  defence: "Defence civilian, forces and allied recruitment notifications.",
  police: "Police, constable, SI and public safety notifications.",
  teaching: "Teacher, lecturer, education and school service notifications.",
  engineering: "Engineering and technical government notifications.",
  healthcare: "Healthcare, nursing and medical department notifications.",
  psu: "Public sector undertaking notifications."
};

export default function DepartmentHubPage() {
  return (
    <div className="bg-[linear-gradient(135deg,#F8FAFC,#EAFBF0)]">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionHeading
            eyebrow="Department-wise notifications"
            title="Browse Govt Job Notifications by Department"
            body="Jump into the exam bodies, departments and recruitment boards candidates track most often, then check eligibility before applying."
          />
          <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-white p-5 shadow-soft">
            <Building2 className="text-success" size={24} aria-hidden="true" />
            <p className="mt-3 text-xl font-black text-primary">A cleaner department journey</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Use departments for discovery, then use SarkariMatch to separate eligible notifications from noise.</p>
          </div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {departments.map((slug) => (
            <Link key={slug} href={`/jobs/department/${slug}`} className="group min-h-36 rounded-3xl border border-[color:var(--border)] bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-[color:var(--brand-green)] hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success">
                  <BriefcaseBusiness size={21} aria-hidden="true" />
                </span>
                <ArrowRight className="text-muted transition group-hover:translate-x-1 group-hover:text-primary" size={18} aria-hidden="true" />
              </div>
              <p className="mt-4 text-lg font-black text-primary">{departmentLabels[slug]}</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-muted">{departmentDescriptions[slug]}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
