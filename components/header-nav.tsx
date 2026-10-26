"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { examFamilies } from "@/lib/exams/directory";

const notificationLinks = [
  ["Latest notifications", "/jobs"],
  ["Central Govt", "/jobs/central"],
  ["State Govt", "/jobs/state"],
  ["By qualification", "/jobs/qualification"],
  ["By department", "/jobs/department"],
  ["Eligibility match", "/eligibility"]
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/jobs") return pathname.startsWith("/jobs") || pathname.startsWith("/eligibility");
  return pathname === href || pathname.startsWith(`${href}/`);
}

const itemClass = "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold text-primary transition hover:bg-mint";

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 text-[0.95rem] font-black text-muted lg:flex">
      <NavItem href="/tests" label="Test Series" active={isActive(pathname, "/tests")}>
        {examFamilies.map((family) => (
          <div key={family.name} className="px-1 py-1">
            <p className="flex items-center justify-between gap-6 px-3 pt-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-muted">
              {family.name}
              {family.comingSoon && <span className="rounded-full bg-surface px-2 py-0.5 text-[0.6rem] tracking-wide">Soon</span>}
            </p>
            {family.exams.map((exam) => <Link key={exam.href} href={exam.href as Route} className={itemClass}>{exam.name} Mock Tests</Link>)}
          </div>
        ))}
        <Link href="/tests" className="mx-1 mt-1 block rounded-lg bg-primary px-3 py-2 text-center text-sm font-black text-white">All test series</Link>
      </NavItem>
      <NavItem href="/jobs" label="Govt Notifications" active={isActive(pathname, "/jobs")}>
        {notificationLinks.map(([label, href]) => <Link key={href} href={href as Route} className={itemClass}>{label}</Link>)}
      </NavItem>
      <Link
        href="/practice"
        aria-current={isActive(pathname, "/practice") ? "page" : undefined}
        className={`whitespace-nowrap rounded-full px-4 py-2.5 transition hover:bg-surface hover:text-primary ${isActive(pathname, "/practice") ? "bg-mint text-primary" : ""}`}
      >
        Practice
      </Link>
      <Link
        href="/blog"
        aria-current={isActive(pathname, "/blog") ? "page" : undefined}
        className={`whitespace-nowrap rounded-full px-4 py-2.5 transition hover:bg-surface hover:text-primary ${isActive(pathname, "/blog") ? "bg-mint text-primary" : ""}`}
      >
        Blog
      </Link>
      <Link
        href="/pricing"
        aria-current={isActive(pathname, "/pricing") ? "page" : undefined}
        className={`whitespace-nowrap rounded-full px-4 py-2.5 transition hover:bg-surface hover:text-primary ${isActive(pathname, "/pricing") ? "bg-mint text-primary" : ""}`}
      >
        Pricing
      </Link>
    </nav>
  );
}

function NavItem({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <div className="group relative">
      <Link
        href={href as Route}
        aria-current={active ? "page" : undefined}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-4 py-2.5 transition hover:bg-surface hover:text-primary ${active ? "bg-mint text-primary" : ""}`}
      >
        {label}
        <ChevronDown size={15} aria-hidden="true" className="transition group-hover:rotate-180" />
      </Link>
      <div className="invisible absolute left-0 top-full z-50 min-w-60 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-2xl border border-border bg-white p-2 text-primary shadow-lift">{children}</div>
      </div>
    </div>
  );
}
