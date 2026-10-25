"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRound } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim() || undefined,
        password: String(formData.get("password") ?? "")
      })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not create your account.");
      return;
    }
    router.push("/dashboard/profile");
    router.refresh();
  }

  return (
    <div className="bg-surface">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift">
          <UserRound className="text-[#B9F8CD]" size={32} aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black tracking-tight">Create your candidate account</h1>
          <p className="mt-3 leading-7 text-white/75">Save one official match profile and use it across govt job and exam notifications.</p>
        </section>
        <form onSubmit={handleSignup} className="grid gap-4 rounded-[2rem] border border-border bg-white p-5 shadow-lift">
          <label className="grid gap-2 font-bold text-primary">Full name<input name="name" autoComplete="name" required className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
          <label className="grid gap-2 font-bold text-primary">Email<input name="email" type="email" autoComplete="email" required className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
          <label className="grid gap-2 font-bold text-primary">Phone<input name="phone" type="tel" autoComplete="tel" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
          <label className="grid gap-2 font-bold text-primary">Create password<input name="password" type="password" autoComplete="new-password" required minLength={8} className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
          {error ? <p className="text-sm font-bold text-error">{error}</p> : null}
          {notice ? <p className="text-sm font-bold text-success">{notice}</p> : null}
          <button disabled={loading} className="min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 py-3 font-black text-white shadow-green disabled:opacity-60">
            {loading ? "Creating account..." : "Create account"}
          </button>
          <Link href="/login" className="text-center text-sm font-black text-primary">Already have an account? Login</Link>
        </form>
      </div>
    </div>
  );
}
