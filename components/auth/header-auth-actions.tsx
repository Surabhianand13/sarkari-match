"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function HeaderAuthActions() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
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
