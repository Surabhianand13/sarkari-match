import { requireAdmin } from "@/lib/auth/guards";
import Link from "next/link";
import type { Route } from "next";

export const metadata = { robots: { index: false, follow: false } };

const adminLinks: ReadonlyArray<readonly [string, Route]> = [
  ["Active notifications", "/admin/posts"],
  ["Draft notifications", "/admin/recruitments"],
  ["Reported errors", "/admin/reports"],
  ["Founding passes sold", "/admin/subscriptions"],
  ["Recent payments", "/admin/payments"],
  ["Audit log", "/admin/audit-log"],
  ["Extraction review", "/admin/extraction"],
  ["Advanced reports", "/admin/advanced-reports"]
];

export default async function AdminPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-primary">Admin Publishing</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {adminLinks.map(([item, href]) => (
          <Link key={item} href={href} className="rounded-lg border border-border bg-white p-5 font-semibold text-primary shadow-soft transition hover:-translate-y-0.5">{item}</Link>
        ))}
      </div>
    </div>
  );
}
