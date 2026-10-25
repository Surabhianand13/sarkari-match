"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

const groups: Array<{ title: string; items: Array<[string, string]> }> = [
  { title: "Notifications", items: [["Overview", "/admin"], ["Organisations", "/admin/organisations"], ["Recruitments", "/admin/recruitments"], ["Posts", "/admin/posts"], ["CSV import", "/admin/import"]] },
  { title: "Mock tests", items: [["Test series", "/admin/tests"], ["Question review", "/admin/questions"], ["Question factory", "/admin/factory"]] },
  { title: "Business", items: [["Payments", "/admin/payments"], ["Subscriptions", "/admin/subscriptions"], ["Reports", "/admin/reports"], ["Audit log", "/admin/audit-log"]] }
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="grid gap-5">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-muted">{group.title}</p>
          <ul className="mt-1 grid gap-0.5">
            {group.items.map(([label, href]) => {
              const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link href={href as Route} aria-current={active ? "page" : undefined} className={`block rounded-xl px-3 py-2 text-sm font-black ${active ? "bg-primary text-white" : "text-primary hover:bg-surface"}`}>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
