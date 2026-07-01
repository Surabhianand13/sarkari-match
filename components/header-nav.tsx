"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import { BriefcaseBusiness, ChevronDown, GraduationCap, Landmark, MapPinned } from "lucide-react";
import { departmentLabels, qualificationLabels, stateLabels } from "@/lib/data/catalog";

const topStates = ["karnataka", "uttar-pradesh", "maharashtra", "tamil-nadu", "telangana", "rajasthan"];
const topQualifications = ["10th-pass", "12th-pass", "iti", "diploma", "graduate", "btech", "postgraduate", "nursing"];
const topDepartments = ["ssc", "upsc", "railways", "banking", "defence", "police", "teaching", "psu"];

function isActive(pathname: string, matchPath: string) {
  if (matchPath === "/jobs") {
    return pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/qualification") && !pathname.startsWith("/jobs/state") && !pathname.startsWith("/jobs/department"));
  }
  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

export function HeaderNav() {
  const pathname = usePathname();
  const jobsActive = isActive(pathname, "/jobs") || pathname.startsWith("/jobs/central") || pathname.startsWith("/jobs/state");
  const qualificationActive = isActive(pathname, "/jobs/qualification");
  const departmentActive = isActive(pathname, "/jobs/department");
  const pricingActive = isActive(pathname, "/pricing");

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 rounded-full bg-surface px-2 py-1 text-sm font-bold text-muted lg:flex">
      <Dropdown label="Govt Job Notifications" active={jobsActive}>
        <div className="grid gap-4 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <MenuFeature href="/jobs/central" icon={Landmark} title="Central Govt Job Notifications" body="UPSC, SSC, Railways, PSUs and central organisations." />
            <MenuFeature href="/jobs/state" icon={MapPinned} title="State Govt Job Notifications" body="Browse every state and then narrow by eligibility." />
          </div>
          <div>
            <p className="px-1 text-[0.68rem] font-black uppercase tracking-[0.18em] text-muted">Popular states</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {topStates.map((state) => <MenuPill key={state} href={`/jobs/state/${state}`} label={stateLabels[state]} />)}
            </div>
          </div>
          <Link href="/jobs" className="rounded-2xl bg-primary px-4 py-3 text-center text-sm font-black text-white shadow-soft">View all latest notifications</Link>
        </div>
      </Dropdown>

      <Dropdown label="Qualifications" active={qualificationActive}>
        <div className="p-4">
          <MenuHeader title="Browse qualification-wise" body="Start from the qualification the candidate already has." />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {topQualifications.map((slug) => <MenuPill key={slug} href={`/jobs/qualification/${slug}`} label={qualificationLabels[slug]} />)}
          </div>
          <Link href="/jobs/qualification" className="mt-3 flex rounded-2xl bg-mint px-4 py-3 text-sm font-black text-success">View all qualification options</Link>
        </div>
      </Dropdown>

      <Dropdown label="Departments" active={departmentActive}>
        <div className="p-4">
          <MenuHeader title="Browse department-wise" body="Find notifications from the exam bodies and departments candidates track most." />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {topDepartments.map((slug) => <MenuPill key={slug} href={`/jobs/department/${slug}`} label={departmentLabels[slug]} />)}
          </div>
          <Link href="/jobs/department" className="mt-3 flex rounded-2xl bg-mint px-4 py-3 text-sm font-black text-success">View all departments</Link>
        </div>
      </Dropdown>

      <Link
        href="/pricing"
        aria-current={pricingActive ? "page" : undefined}
        className={`rounded-full px-3 py-2 transition hover:bg-white hover:text-primary hover:shadow-soft ${pricingActive ? "bg-white text-primary shadow-soft ring-1 ring-[rgba(24,185,67,0.18)]" : ""}`}
      >
        Pricing
      </Link>
    </nav>
  );
}

function Dropdown({ label, active, children }: { label: string; active: boolean; children: ReactNode }) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-expanded="false"
        className={`inline-flex items-center gap-1 rounded-full px-3 py-2 transition hover:bg-white hover:text-primary hover:shadow-soft ${active ? "bg-white text-primary shadow-soft ring-1 ring-[rgba(24,185,67,0.18)]" : ""}`}
      >
        {label}
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-[35rem] -translate-x-1/2 rounded-[1.5rem] border border-[color:var(--border)] bg-white text-primary opacity-0 shadow-lift transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {children}
      </div>
    </div>
  );
}

function MenuFeature({ href, icon: Icon, title, body }: { href: string; icon: ElementType; title: string; body: string }) {
  return (
    <Link href={href as Route} className="group/item rounded-2xl border border-[color:var(--border)] bg-surface p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--brand-green)] hover:bg-white">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success"><Icon size={20} aria-hidden="true" /></span>
      <p className="mt-3 font-black text-primary">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-muted">{body}</p>
    </Link>
  );
}

function MenuPill({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as Route} className="rounded-2xl border border-[color:var(--border)] bg-surface px-3 py-2 text-sm font-black text-primary transition hover:border-[color:var(--brand-green)] hover:bg-mint">
      {label}
    </Link>
  );
}

function MenuHeader({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-mint text-success">
          {title.includes("qualification") ? <GraduationCap size={18} aria-hidden="true" /> : <BriefcaseBusiness size={18} aria-hidden="true" />}
        </span>
        <p className="font-black text-primary">{title}</p>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-muted">{body}</p>
    </div>
  );
}
