"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const hiddenPrefixes = ["/admin", "/login", "/signup", "/checkout", "/dashboard", "/tests/attempt"];
const STORAGE_KEY = "sm_login_prompt";

type PromptState = { startedAt: number; shown: number };

function readState(): PromptState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PromptState;
  } catch {}
  return { startedAt: Date.now(), shown: 0 };
}

function writeState(state: PromptState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// Asks signed-out visitors to log in after 10 seconds of use, and once more a minute after that if they are still here.
export function LoginPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const hidden = hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user: unknown }) => setSignedOut(!data.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!signedOut || hidden) return;
    const state = readState();
    writeState(state);
    if (state.shown >= 2) return;
    const delay = state.shown === 0 ? Math.max(0, 10000 - (Date.now() - state.startedAt)) : 60000;
    const timer = setTimeout(() => {
      writeState({ ...readState(), shown: state.shown + 1 });
      setOpen(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [signedOut, hidden, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || hidden) return null;
  return <LoginDialog onClose={() => setOpen(false)} next={pathname} />;
}

function LoginDialog({ onClose, next }: { onClose: () => void; next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (response.ok) {
      window.location.reload();
      return;
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "Could not sign in. Try again.");
    setBusy(false);
  }

  const query = `?next=${encodeURIComponent(next)}`;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-primary/40 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="login-prompt-title">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-lift">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 text-muted hover:bg-surface" aria-label="Close"><X size={18} aria-hidden="true" /></button>
        <h2 id="login-prompt-title" className="text-2xl font-black text-primary">Log in to continue</h2>
        <p className="mt-1 text-sm text-muted">Save your progress, take the free sample test and see your results with solutions.</p>
        <form onSubmit={submit} className="mt-5 grid gap-3">
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" className="min-h-12 rounded-2xl border border-border px-4 font-semibold" />
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete="current-password" className="min-h-12 rounded-2xl border border-border px-4 font-semibold" />
          {error && <p role="alert" className="text-sm font-bold text-error">{error}</p>}
          <button disabled={busy} className="min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] font-black text-white disabled:opacity-60">{busy ? "Signing in..." : "Log in"}</button>
        </form>
        <p className="mt-4 text-center text-sm font-semibold text-muted">New here? <Link href={`/signup${query}` as Route} className="font-black text-primary underline">Create a free account</Link></p>
      </div>
    </div>
  );
}
