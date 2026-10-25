"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

export function HeaderAuthActions() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user: { roles?: string[] } | null }) => {
        if (cancelled) return;
        setSignedIn(Boolean(data.user));
        setIsAdmin(Boolean(data.user?.roles?.includes("admin")));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSignedIn(false);
    router.push("/");
    router.refresh();
  }

  if (signedIn) {
    return (
      <>
        <Link href="/dashboard" className="inline-flex size-11 items-center justify-center rounded-md text-primary hover:bg-background lg:hidden" aria-label="Dashboard">
          <UserRound size={20} aria-hidden="true" />
        </Link>
        {isAdmin && (
          <Link href="/admin" className="inline-flex rounded-full bg-primary px-3 py-2 text-sm font-black text-white">
            Admin
          </Link>
        )}
        <Link href="/dashboard" className="hidden rounded-full px-3 py-2 text-sm font-black text-primary hover:bg-mint sm:inline-flex">
          Dashboard
        </Link>
        <button onClick={handleSignOut} className="hidden items-center gap-1 rounded-full px-3 py-2 text-sm font-black text-primary hover:bg-mint sm:inline-flex" aria-label="Sign out">
          <LogOut size={16} aria-hidden="true" />
        </button>
      </>
    );
  }

  return (
    <>
      <Link href="/login" className="inline-flex size-11 items-center justify-center rounded-md text-primary hover:bg-background lg:hidden" aria-label="Sign in">
        <UserRound size={20} aria-hidden="true" />
      </Link>
      <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm font-black text-primary hover:bg-mint sm:inline-flex">
        Sign In
      </Link>
    </>
  );
}
