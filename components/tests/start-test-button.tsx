"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

export function StartTestButton({ testId, returnPath, checkoutPath, label = "Start test", className = "" }: { testId: string; returnPath: string; checkoutPath: string; label?: string; className?: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  async function start() {
    setState({ loading: true, error: null });
    const response = await fetch(`/api/tests/${testId}/start`, { method: "POST" });
    const data = (await response.json().catch(() => ({}))) as { attemptId?: string; error?: string; reason?: string };
    if (response.ok && data.attemptId) {
      router.push(`/tests/attempt/${data.attemptId}` as Route);
      return;
    }
    if (data.reason === "login") {
      router.push(`/signup?next=${encodeURIComponent(returnPath)}` as Route);
      return;
    }
    if (data.reason === "locked") {
      router.push(checkoutPath as Route);
      return;
    }
    setState({ loading: false, error: data.error ?? "Could not start the test." });
  }

  return (
    <div>
      <button onClick={start} disabled={state.loading} className={`min-h-12 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-6 text-sm font-black text-white shadow-green disabled:opacity-60 ${className}`}>
        {state.loading ? "Starting..." : label}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm font-bold text-error">{state.error}</p>}
    </div>
  );
}
