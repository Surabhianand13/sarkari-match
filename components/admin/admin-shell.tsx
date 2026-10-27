"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Layers, BarChart3, BookOpen, ClipboardList, FileSpreadsheet, Image as ImageIcon, LayoutDashboard, LogOut, Menu, Building2, Briefcase, FileText, Wand2, CreditCard, Users, History, X, ListChecks, ExternalLink } from "lucide-react";
import type { ElementType } from "react";

type NavGroup = { title: string; items: Array<[string, string, ElementType]> };

const groups: NavGroup[] = [
  { title: "Main", items: [["Dashboard", "/admin", LayoutDashboard]] },
  { title: "Test platform", items: [["Exams and offers", "/admin/exams", Layers], ["Test series", "/admin/tests", ClipboardList], ["Test builder", "/admin/tests/builder", Wand2], ["Question review", "/admin/questions", ListChecks], ["Question factory", "/admin/factory", Wand2]] },
  { title: "Notifications", items: [["Organisations", "/admin/organisations", Building2], ["Recruitments", "/admin/recruitments", Briefcase], ["Posts", "/admin/posts", FileText], ["CSV import", "/admin/import", FileSpreadsheet]] },
  { title: "Business", items: [["Paid learners", "/admin/subscriptions", Users], ["Payments", "/admin/payments", CreditCard], ["Reports", "/admin/reports", BarChart3], ["Waitlist", "/admin/waitlist", Users]] },
  { title: "Content", items: [["Homepage banners", "/admin/banners", ImageIcon], ["Blog", "/admin/blog", BookOpen]] },
  { title: "System", items: [["Audit log", "/admin/audit-log", History]] }
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col overflow-y-auto px-3 pb-6">
      <div className="flex items-center gap-3 px-3 py-5">
        <Image src="/brand/sarkarimatch-icon-512.png" alt="" width={40} height={40} className="size-10 rounded-xl" />
        <div className="leading-tight">
          <p className="font-black text-white">Sarkari Match</p>
          <p className="text-xs font-semibold text-white/50">Admin Panel</p>
        </div>
      </div>
      {groups.map((group) => (
        <div key={group.title} className="mt-4">
          <p className="px-3 text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/40">{group.title}</p>
          <ul className="mt-2 grid gap-1">
            {group.items.map(([label, href, Icon]) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link href={href as Route} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${active ? "bg-[rgba(24,185,67,0.16)] text-[#7CE9A0]" : "text-white/70 hover:bg-white/8 hover:text-white"}`}>
                    <Icon size={18} aria-hidden="true" /> {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <Link href="/" className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 pt-6 text-sm font-bold text-white/60 hover:text-white"><ExternalLink size={18} aria-hidden="true" /> View website</Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f3f5f9] lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden bg-[#141a2e] lg:sticky lg:top-0 lg:block lg:h-screen">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-[#141a2e]">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-full p-2 text-white/70" aria-label="Close menu"><X size={20} aria-hidden="true" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-primary lg:hidden" aria-label="Open menu"><Menu size={22} aria-hidden="true" /></button>
            <p className="text-lg font-black text-primary">Admin</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-sm font-bold text-muted sm:flex"><span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-black text-white">{email.charAt(0).toUpperCase()}</span>{email}</span>
            <button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-black text-primary hover:bg-surface"><LogOut size={16} aria-hidden="true" /> Logout</button>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
