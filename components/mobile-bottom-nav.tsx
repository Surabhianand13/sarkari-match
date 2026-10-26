"use client";

import Link from "next/link";
import type { Route } from "next";
import { BriefcaseBusiness, ClipboardCheck, Home, UserRound, Wand2 } from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  ["Home", "/", Home],
  ["Tests", "/tests", ClipboardCheck],
  ["Notices", "/jobs", BriefcaseBusiness],
  ["Match", "/eligibility", Wand2],
  ["Account", "/dashboard/tests", UserRound]
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_34px_rgba(11,45,99,0.12)] backdrop-blur-md md:hidden">
      <div className="grid grid-cols-5">
        {items.map(([label, href, Icon]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href as Route} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${active ? "text-primary" : "text-muted"}`} aria-current={active ? "page" : undefined}>
              <span className={`flex size-8 items-center justify-center rounded-full ${active ? "bg-mint" : ""}`}>
                <Icon size={19} aria-hidden="true" />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
