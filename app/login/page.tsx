import Link from "next/link";
import { KeyRound, MessageSquareText, ShieldCheck } from "lucide-react";

export default function LoginPage() {
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
          <form action="/dashboard" className="rounded-[2rem] border border-border bg-white p-5 shadow-lift">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success"><KeyRound size={20} aria-hidden="true" /></span>
              <div>
                <h2 className="text-xl font-black text-primary">Login with password</h2>
                <p className="text-sm font-semibold text-muted">For returning candidates with a saved password.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 font-bold text-primary">Email or phone<input name="identifier" autoComplete="username" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
              <label className="grid gap-2 font-bold text-primary">Password<input name="password" type="password" autoComplete="current-password" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
              <button className="min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 py-3 font-black text-white shadow-green">Login</button>
            </div>
          </form>

          <form action="/login/otp-sent" className="rounded-[2rem] border border-border bg-white p-5 shadow-lift">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-soft text-teal"><MessageSquareText size={20} aria-hidden="true" /></span>
              <div>
                <h2 className="text-xl font-black text-primary">Sign in with OTP</h2>
                <p className="text-sm font-semibold text-muted">Receive a one-time code on phone or email.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 font-bold text-primary">Phone or email<input name="identifier" autoComplete="email" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
              <button className="min-h-12 rounded-full border border-primary bg-white px-5 py-3 font-black text-primary shadow-soft">Send OTP</button>
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
