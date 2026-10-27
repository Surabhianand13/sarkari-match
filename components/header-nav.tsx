"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Banknote, BookOpen, ChevronDown, ChevronRight, Cog, Compass, GraduationCap, Landmark, Search, Shield, Siren, TrainFront } from "lucide-react";
import type { ElementType } from "react";
import type { ExamFamily, ExamFamilyIcon } from "@/lib/exams/directory";

const familyIcons: Record<ExamFamilyIcon, ElementType> = {
  ssc: BookOpen, railway: TrainFront, teaching: GraduationCap, civil: Landmark, banking: Banknote,
  defence: Shield, police: Siren, state: Compass, engineering: Cog
};

const notificationLinks = [
  ["Latest notifications", "/jobs"],
  ["Central Govt", "/jobs/central"],
  ["State Govt", "/jobs/state"],
  ["By qualification", "/jobs/qualification"],
  ["By department", "/jobs/department"],
  ["Eligibility match", "/eligibility"]
] as const;

const plainLinks = [["Practice", "/practice"], ["Blog", "/blog"]] as const;

function isActive(pathname: string, href: string) {
  if (href === "/jobs") return pathname.startsWith("/jobs") || pathname.startsWith("/eligibility");
  return pathname === href || pathname.startsWith(`${href}/`);
}

const pill = (active: boolean) => `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2.5 transition hover:bg-surface xl:px-4 hover:text-primary ${active ? "bg-mint text-primary" : ""}`;

export function HeaderNav({ families }: { families: ExamFamily[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 text-[0.95rem] font-black text-muted lg:flex">
      <ExamsMegaMenu active={isActive(pathname, "/tests")} families={families} />
      <div className="group relative">
        <Link href="/jobs" aria-current={isActive(pathname, "/jobs") ? "page" : undefined} className={pill(isActive(pathname, "/jobs"))}>
          Govt Notifications <ChevronDown size={15} aria-hidden="true" className="transition group-hover:rotate-180" />
        </Link>
        <div className="invisible absolute left-0 top-full z-50 min-w-60 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <div className="rounded-2xl border border-border bg-white p-2 text-primary shadow-lift">
            {notificationLinks.map(([label, href]) => <Link key={href} href={href as Route} className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition hover:bg-mint">{label}</Link>)}
          </div>
        </div>
      </div>
      {plainLinks.map(([label, href]) => (
        <Link key={href} href={href as Route} aria-current={isActive(pathname, href) ? "page" : undefined} className={pill(isActive(pathname, href))}>{label}</Link>
      ))}
      <form action="/jobs" role="search" className="relative ml-2 hidden 2xl:block">
        <input name="q" type="search" placeholder="Search notifications" aria-label="Search notifications" className="h-11 w-56 rounded-xl border border-border bg-white pl-4 pr-10 text-sm font-semibold text-foreground placeholder:text-muted/70" />
        <button aria-label="Search" className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-primary"><Search size={18} aria-hidden="true" /></button>
      </form>
    </nav>
  );
}

// Categories down the left; hovering (or focusing) one shows its exams on the right. Only live exams link anywhere.
function ExamsMegaMenu({ active, families }: { active: boolean; families: ExamFamily[] }) {
  const firstLive = families.find((family) => !family.comingSoon) ?? families[0];
  const [selected, setSelected] = useState(firstLive.slug);
  const current = families.find((family) => family.slug === selected) ?? firstLive;
  return (
    <div className="group">
      <Link href="/tests" aria-current={active ? "page" : undefined} className={pill(active)}>
        Exams &amp; Test Series <ChevronDown size={15} aria-hidden="true" className="transition group-hover:rotate-180" />
      </Link>
      <div className="invisible absolute inset-x-0 top-full z-50 px-4 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="mx-auto grid max-h-[72vh] max-w-6xl overflow-hidden rounded-3xl border border-border bg-white text-primary shadow-lift md:grid-cols-[17rem_1fr]">
          <ul className="overflow-y-auto border-r border-border bg-white p-2" role="tablist" aria-label="Exam categories">
            {families.map((item) => {
              const Icon = familyIcons[item.icon];
              const on = item.slug === current.slug;
              return (
                <li key={item.slug}>
                  <button role="tab" aria-selected={on} onMouseEnter={() => setSelected(item.slug)} onFocus={() => setSelected(item.slug)} onClick={() => setSelected(item.slug)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black transition ${on ? "bg-mint text-primary" : "text-primary hover:bg-surface"}`}>
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${on ? "bg-white text-success shadow-soft" : "bg-surface text-muted"}`}><Icon size={18} aria-hidden="true" /></span>
                    <span className="flex-1">{item.name}</span>
                    <ChevronRight size={16} className={on ? "text-success" : "text-muted"} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="overflow-y-auto bg-surface p-5" role="tabpanel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-lg font-black text-primary">{current.name}</p>
              {current.comingSoon && <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-muted">Coming soon</span>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {current.exams.map((exam) => (
                <Link key={exam.href} href={exam.href as Route} className="flex items-center justify-between gap-2 rounded-2xl border border-[rgba(24,185,67,0.35)] bg-white px-4 py-4 text-sm font-black text-primary shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                  <span>{exam.name}<span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-success">Live</span></span>
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              ))}
              {current.upcoming.map((name) => (
                <div key={name} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-white/70 px-4 py-4 text-sm font-black text-muted" aria-disabled="true">
                  <span>{name}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[0.65rem] uppercase tracking-wide">Soon</span>
                </div>
              ))}
            </div>
            <Link href="/tests" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-black text-white">See all test series</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
