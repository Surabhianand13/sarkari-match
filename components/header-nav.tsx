"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ElementType, ReactNode } from "react";
import { BriefcaseBusiness, ChevronDown, GraduationCap, Landmark, MapPinned } from "lucide-react";
import { examFamilies } from "@/lib/exams/directory";


function isActive(pathname: string, matchPath: string) {
  if (matchPath === "/jobs") {
    return pathname === "/jobs" || (pathname.startsWith("/jobs/") && !pathname.startsWith("/jobs/qualification") && !pathname.startsWith("/jobs/state") && !pathname.startsWith("/jobs/department"));
  }
  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

export function HeaderNav() {
  const pathname = usePathname();
  const jobsActive = pathname.startsWith("/jobs") || isActive(pathname, "/eligibility");
  const pricingActive = isActive(pathname, "/pricing");
  const testsActive = isActive(pathname, "/tests");

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 rounded-full bg-surface px-2 py-1 text-sm font-bold text-muted lg:flex">
      <Dropdown label="Test Series & Question Bank" active={testsActive}>
        <div className="grid gap-3 p-4">
          <MenuHeader title="Choose your exam" body="Full-length mock tests and a question bank written by experts, checked by AI." />
          <div className="grid gap-3 sm:grid-cols-2">
            {examFamilies.map((family) => (
              <div key={family.name} className="rounded-2xl border border-[color:var(--border)] bg-surface p-3">
                <p className="flex items-center gap-2 font-black text-primary">
                  {family.name}
                  {family.comingSoon && <span className="rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-muted">Coming soon</span>}
                </p>
                {family.exams.map((exam) => (
                  <Link key={exam.href} href={exam.href as Route} className="mt-2 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-black text-primary transition hover:bg-mint">
                    {exam.name}
                    <span className="text-xs font-bold text-success">Mock tests</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <Link href="/tests" className="rounded-2xl bg-primary px-4 py-3 text-center text-sm font-black text-white shadow-soft">See all test series</Link>
        </div>
      </Dropdown>

      <Dropdown label="Govt Exam & Job Notifications" active={jobsActive}>
        <div className="grid gap-4 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <MenuFeature href="/jobs/central" icon={Landmark} title="Central Govt Notifications" body="UPSC, SSC, Railways, PSUs and central organisations." />
            <MenuFeature href="/jobs/state" icon={MapPinned} title="State Govt Notifications" body="Browse every state and then narrow by eligibility." />
            <MenuFeature href="/jobs/qualification" icon={GraduationCap} title="By qualification" body="10th pass, 12th pass, graduate, ITI, diploma and more." />
            <MenuFeature href="/jobs/department" icon={BriefcaseBusiness} title="By department" body="SSC, UPSC, Railways, Banking, Defence, Police and more." />
          </div>
          <div className="flex gap-2">
            <Link href="/jobs" className="flex-1 rounded-2xl bg-primary px-4 py-3 text-center text-sm font-black text-white shadow-soft">All latest notifications</Link>
            <Link href="/eligibility" className="flex-1 rounded-2xl bg-mint px-4 py-3 text-center text-sm font-black text-success">Check my eligibility</Link>
          </div>
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

function MenuHeader({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-2xl bg-mint text-success">
          <GraduationCap size={18} aria-hidden="true" />
        </span>
        <p className="font-black text-primary">{title}</p>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-muted">{body}</p>
    </div>
  );
}
