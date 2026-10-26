"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

const items = [
  ["Test Series", "/tests"],
  ["Govt Notifications", "/jobs"],
  ["Pricing", "/pricing"]
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/jobs") return pathname.startsWith("/jobs") || pathname.startsWith("/eligibility");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 text-[0.95rem] font-black text-muted lg:flex">
      {items.map(([label, href]) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href as Route}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2.5 transition hover:bg-surface hover:text-primary ${active ? "bg-mint text-primary" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
