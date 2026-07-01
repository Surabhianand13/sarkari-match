import Link from "next/link";
import { ArrowRight, MapPinned, SearchCheck } from "lucide-react";
import { SectionHeading } from "@/components/design-system";
import { stateLabels, states } from "@/lib/data/catalog";

const stateOptions = states.filter((state) => state !== "central-government");

export default function StateGovtJobsHubPage() {
  return (
    <div className="bg-[linear-gradient(135deg,#F8FAFC,#E8F8FA)]">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <SectionHeading
            eyebrow="State govt notifications"
            title="Choose a state to view Govt Job Notifications"
            body="State government notifications can depend on domicile, local language, category rules and state-specific application windows. Start with the state, then check eligibility."
          />
          <div className="rounded-[1.75rem] border border-[rgba(24,185,67,0.22)] bg-white p-5 shadow-soft">
            <SearchCheck className="text-success" size={24} aria-hidden="true" />
            <p className="mt-3 text-xl font-black text-primary">Premium state journey</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Pick a state, see matching departments and deadlines, then run your candidate profile through post-level eligibility rules.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stateOptions.map((state, index) => (
            <Link
              key={state}
              href={`/jobs/state/${state}`}
              className={`group min-h-32 rounded-3xl border bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:border-[color:var(--brand-green)] hover:shadow-lift ${index < 4 ? "border-[rgba(24,185,67,0.3)]" : "border-[color:var(--border)]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success">
                  <MapPinned size={21} aria-hidden="true" />
                </span>
                <ArrowRight className="text-muted transition group-hover:translate-x-1 group-hover:text-primary" size={18} aria-hidden="true" />
              </div>
              <p className="mt-4 text-lg font-black text-primary">{stateLabels[state]}</p>
              <p className="mt-1 text-sm font-semibold text-muted">State-wise notifications and eligibility context</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
