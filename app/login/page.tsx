"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, MessageSquareText, ShieldCheck } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function isEmail(identifier: string) {
  return identifier.includes("@");
}

export default function LoginPage() {
  const router = useRouter();
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  async function handlePasswordLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setPasswordError("Sign-in is not configured yet.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setPasswordLoading(true);
    const { error } = isEmail(identifier)
      ? await supabase.auth.signInWithPassword({ email: identifier, password })
      : await supabase.auth.signInWithPassword({ phone: identifier, password });
    setPasswordLoading(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleOtpRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOtpError(null);
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setOtpError("OTP sign-in is not configured yet.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    setOtpLoading(true);
    const { error } = isEmail(identifier)
      ? await supabase.auth.signInWithOtp({ email: identifier })
      : await supabase.auth.signInWithOtp({ phone: identifier });
    setOtpLoading(false);
    if (error) {
      setOtpError(error.message);
      return;
    }
    router.push(`/login/otp-sent?identifier=${encodeURIComponent(identifier)}`);
  }

  return (
    <div className="bg-surface">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift">
          <ShieldCheck className="text-[#B9F8CD]" size={32} aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-black tracking-tight">Sign in to SarkariMatch</h1>
          <p className="mt-3 leading-7 text-white/75">Return to saved notifications, profile matches and deadline reminders.</p>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-white/78">
            <p className="rounded-2xl bg-white/12 p-4">Use password when you already created credentials.</p>
            <p className="rounded-2xl bg-white/12 p-4">Use OTP when you want a quick phone or email sign-in.</p>
          </div>
        </section>

        <div className="grid gap-4">
          <form onSubmit={handlePasswordLogin} className="rounded-[2rem] border border-border bg-white p-5 shadow-lift">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success"><KeyRound size={20} aria-hidden="true" /></span>
              <div>
                <h2 className="text-xl font-black text-primary">Login with password</h2>
                <p className="text-sm font-semibold text-muted">For returning candidates with a saved password.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 font-bold text-primary">Email or phone<input name="identifier" autoComplete="username" required className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
              <label className="grid gap-2 font-bold text-primary">Password<input name="password" type="password" autoComplete="current-password" required className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
              {passwordError ? <p className="text-sm font-bold text-error">{passwordError}</p> : null}
              <button disabled={passwordLoading} className="min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 py-3 font-black text-white shadow-green disabled:opacity-60">
                {passwordLoading ? "Signing in..." : "Login"}
              </button>
            </div>
          </form>

          <form onSubmit={handleOtpRequest} className="rounded-[2rem] border border-border bg-white p-5 shadow-lift">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-soft text-teal"><MessageSquareText size={20} aria-hidden="true" /></span>
              <div>
                <h2 className="text-xl font-black text-primary">Sign in with OTP</h2>
                <p className="text-sm font-semibold text-muted">Receive a one-time code on phone or email.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 font-bold text-primary">Phone or email<input name="identifier" autoComplete="email" required className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
              {otpError ? <p className="text-sm font-bold text-error">{otpError}</p> : null}
              <button disabled={otpLoading} className="min-h-12 rounded-full border border-primary bg-white px-5 py-3 font-black text-primary shadow-soft disabled:opacity-60">
                {otpLoading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </form>

          <p className="text-center text-sm font-bold text-muted">
            New to SarkariMatch? <Link href="/signup" className="font-black text-primary">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
