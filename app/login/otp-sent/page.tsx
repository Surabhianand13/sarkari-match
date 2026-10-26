"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Route } from "next";
import { safeNextPath } from "@/lib/auth/next-path";

function OtpVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifier = searchParams.get("identifier") ?? "";
  const next = safeNextPath(searchParams.get("next"), "/dashboard");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!identifier) {
      setError("Missing email to verify. Please request a new code.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("otp") ?? "").trim();
    setLoading(true);
    const response = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, code })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not verify the code.");
      return;
    }
    router.push(next as Route);
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift">
        <ShieldCheck className="text-[#B9F8CD]" size={32} aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-black tracking-tight">OTP sent</h1>
        <p className="mt-3 leading-7 text-white/75">
          {identifier ? `Enter the 6-digit code sent to ${identifier}.` : "Enter the 6-digit code to open your saved notification workspace."}
        </p>
      </section>
      <form onSubmit={handleVerify} className="grid gap-4 rounded-[2rem] border border-border bg-white p-5 shadow-lift">
        <label className="grid gap-2 font-bold text-primary">One-time password<input name="otp" inputMode="numeric" maxLength={6} required placeholder="123456" className="min-h-12 rounded-2xl border border-border px-3 py-2 text-center text-xl font-black tracking-[0.24em]" /></label>
        {error ? <p className="text-sm font-bold text-error">{error}</p> : null}
        <button disabled={loading} className="min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 py-3 font-black text-white shadow-green disabled:opacity-60">
          {loading ? "Verifying..." : "Verify and login"}
        </button>
        <Link href="/login" className="text-center text-sm font-black text-primary">Use password instead</Link>
      </form>
    </div>
  );
}

export default function OtpSentPage() {
  return (
    <div className="bg-surface">
      <Suspense fallback={null}>
        <OtpVerifyForm />
      </Suspense>
    </div>
  );
}
