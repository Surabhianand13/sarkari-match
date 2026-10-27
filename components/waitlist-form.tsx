"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Turnstile, turnstileConfigured } from "@/components/turnstile";

export function WaitlistForm({ exam = "ssc-cgl", source = "site", label = "Notify me when it launches", dark = false }: { exam?: string; source?: string; label?: string; dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("busy");
    setError("");
    const response = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, exam, source, turnstileToken: token }) });
    if (response.ok) {
      setState("done");
      return;
    }
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "Something went wrong. Please try again.");
    setState("idle");
  }

  if (state === "done") return <p className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${dark ? "bg-white/15 text-white" : "bg-mint text-success"}`}><Check size={18} aria-hidden="true" /> You are on the list. We will email you at launch.</p>;
  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email" autoComplete="email" aria-label="Your email" className="min-h-12 flex-1 rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground" />
        <button disabled={state === "busy" || (turnstileConfigured && !token)} className="min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-6 text-sm font-black text-white shadow-green disabled:opacity-60">{state === "busy" ? "Adding..." : label}</button>
      </div>
      {turnstileConfigured && <div className="mt-3"><Turnstile onToken={setToken} /></div>}
      {error && <p role="alert" className="mt-2 text-sm font-bold text-error">{error}</p>}
    </form>
  );
}
