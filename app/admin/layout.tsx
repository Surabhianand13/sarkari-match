import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const hasDb = Boolean(await getDb());
  return (
    <div className="mx-auto grid max-w-[88rem] gap-6 px-4 py-6 lg:grid-cols-[14rem_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="px-3 text-sm font-black text-primary">Admin</p>
        <p className="mb-4 truncate px-3 text-xs font-semibold text-muted">{admin.email}</p>
        <AdminNav />
      </aside>
      <main className="min-w-0">
        {hasDb ? children : <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm font-bold text-warning">The admin dashboard needs DATABASE_URL to be configured.</p>}
      </main>
    </div>
  );
}
