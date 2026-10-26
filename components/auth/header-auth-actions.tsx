"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { LogOut, UserRound } from "lucide-react";

type Me = { fullName?: string | null; name?: string | null; email?: string; roles?: string[] };

export function HeaderAuthActions() {
  const router = useRouter();
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user: Me | null }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  if (!user) {
    return (
      <Link href="/login" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-sm font-black text-primary hover:bg-mint">
        Sign In
      </Link>
    );
  }

  const label = user.fullName ?? user.name ?? user.email ?? "Account";
  const isAdmin = Boolean(user.roles?.includes("admin"));
  const itemClass = "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-primary hover:bg-mint";
  return (
    <div className="group relative">
      <Link href="/dashboard/tests" className="inline-flex size-11 items-center justify-center rounded-full bg-primary text-sm font-black text-white" aria-label="Your account">
        {label.trim().charAt(0).toUpperCase() || <UserRound size={18} aria-hidden="true" />}
      </Link>
      <div className="invisible absolute right-0 top-full z-50 w-56 pt-2 opacity-0 transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-2xl border border-border bg-white p-2 shadow-lift">
          <p className="truncate px-3 py-2 text-xs font-bold text-muted">{user.email ?? label}</p>
          <Link href={"/dashboard/tests" as Route} className={itemClass}>My tests</Link>
          <Link href={"/dashboard/progress" as Route} className={itemClass}>My progress</Link>
          <Link href={"/dashboard/billing" as Route} className={itemClass}>My plans</Link>
          <Link href={"/practice" as Route} className={itemClass}>Practice</Link>
          <Link href={"/dashboard" as Route} className={itemClass}>Dashboard</Link>
          {isAdmin && <Link href={"/admin" as Route} className={itemClass}>Admin panel</Link>}
          <button onClick={handleSignOut} className={`${itemClass} w-full`}><LogOut size={15} aria-hidden="true" /> Sign out</button>
        </div>
      </div>
    </div>
  );
}
