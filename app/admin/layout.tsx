import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const hasDb = Boolean(await getDb());
  return (
    <AdminShell email={admin.email}>
      {hasDb ? children : <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm font-bold text-warning">The admin dashboard needs DATABASE_URL to be configured.</p>}
    </AdminShell>
  );
}
