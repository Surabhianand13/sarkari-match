"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { LevelStepper } from "@/components/practice/level-stepper";
import type { Level } from "@/lib/practice-shared";

export function SubjectCard({ subject, questions, topics, level, goodSessions, signedIn }: { subject: string; questions: number; topics: string[]; level: Level; goodSessions: number; signedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function start(topic: string | null) {
    if (!signedIn) {
      router.push("/signup?next=/practice" as Route);
      return;
    }
    setBusy(topic ?? "all");
    setError("");
    const response = await fetch("/api/practice/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subject, topic }) });
    const data = (await response.json().catch(() => ({}))) as { sessionId?: string; error?: string };
    if (response.ok && data.sessionId) {
      router.push(`/practice/${data.sessionId}` as Route);
      return;
    }
    setError(data.error ?? "Could not start practice.");
    setBusy(null);
  }

  return (
    <article className="flex flex-col rounded-3xl border border-border bg-white p-6 shadow-soft">
      <h2 className="text-xl font-black text-primary">{subject}</h2>
      <p className="mt-1 text-sm font-semibold text-muted">{questions.toLocaleString("en-IN")} questions</p>
      <div className="mt-4"><LevelStepper level={level} goodSessions={goodSessions} /></div>
      <button onClick={() => start(null)} disabled={busy !== null} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white disabled:opacity-60">
        {busy === "all" ? "Starting..." : "Practise 10 questions"} <ArrowRight size={16} aria-hidden="true" />
      </button>
      {topics.length > 1 && (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-muted">Or pick a topic</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topics.slice(0, 12).map((topic) => (
              <button key={topic} onClick={() => start(topic)} disabled={busy !== null} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-black text-primary hover:bg-mint disabled:opacity-60">{busy === topic ? "Starting..." : topic}</button>
            ))}
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-bold text-error">{error}</p>}
    </article>
  );
}
