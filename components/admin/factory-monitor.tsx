"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Square } from "lucide-react";
import type { Snapshot } from "@/lib/question-factory/monitor";

const terminal = ["completed", "failed", "cancelled"];

const outcomeStyle: Record<string, string> = {
  passed: "bg-mint text-success",
  fixed: "bg-amber-soft text-warning",
  rejected: "bg-red-50 text-error",
  review: "bg-cyan-soft text-teal",
  error: "bg-red-50 text-error",
  info: "bg-surface text-muted"
};
const outcomeLabel: Record<string, string> = { passed: "Passed", fixed: "Fixed", rejected: "Rejected", review: "Review", error: "Error", info: "Note" };
const stageName: Record<string, string> = { write: "Writer", solve: "Solver", review: "Review", language: "Language", syllabus: "Syllabus", dedupe: "Repeats", fix: "Fixer" };

// Which AI is a good fit for each stage. Writing and checking by different models catches errors the writer would repeat.
const suggestedAi: Record<string, string> = { write: "Claude", solve: "ChatGPT", review: "ChatGPT", fix: "Claude" };

function statusText(snapshot: Snapshot) {
  switch (snapshot.batch.status) {
    case "completed": return "Finished";
    case "failed": return "Stopped with an error";
    case "cancelled": return "Stopped";
    case "waiting_ai": return "Waiting for AI answers";
    default: return "Running";
  }
}

export function FactoryMonitor({ id, initial }: { id: string; initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const status = useRef(initial.batch.status);

  const apply = useCallback((next: Snapshot) => {
    status.current = next.batch.status;
    setSnapshot(next);
  }, []);

  useEffect(() => {
    let stopped = false;
    async function loop() {
      while (!stopped && !terminal.includes(status.current)) {
        const working = status.current === "running";
        try {
          const response = await fetch(`/api/admin/factory/${id}${working ? "/tick" : ""}`, { method: working ? "POST" : "GET", cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error ?? "Something went wrong");
          if (!stopped) {
            setError(null);
            apply(body as Snapshot);
          }
        } catch (problem) {
          if (!stopped) setError(problem instanceof Error ? problem.message : "Lost connection");
        }
        await new Promise((resolve) => setTimeout(resolve, working ? 400 : 4000));
      }
    }
    void loop();
    return () => {
      stopped = true;
    };
  }, [id, apply]);

  const { batch, totals, stages, events, tasks } = snapshot;
  const settled = totals.written - totals.inFlight;
  const percent = batch.requested ? Math.min(100, Math.round((settled / batch.requested) * 100)) : 0;
  const waiting = Object.entries(tasks).filter(([, count]) => count > 0);

  async function stop() {
    await fetch(`/api/admin/factory/${id}/cancel`, { method: "POST" });
    const refreshed = await fetch(`/api/admin/factory/${id}`, { cache: "no-store" });
    if (refreshed.ok) apply(await refreshed.json());
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-black text-primary">{batch.subject}{batch.topic ? `: ${batch.topic}` : ""}</p>
            <p className="text-sm font-semibold text-muted">{batch.requested} questions requested. Mode: {batch.mode === "queue" ? "chat queue" : batch.mode === "api" ? "AI API" : "no AI, exact arithmetic"}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black ${batch.status === "completed" ? "bg-mint text-success" : batch.status === "failed" || batch.status === "cancelled" ? "bg-red-50 text-error" : batch.status === "waiting_ai" ? "bg-amber-soft text-warning" : "bg-cyan-soft text-teal"}`}>
              {batch.status === "running" && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
              {statusText(snapshot)}
            </span>
            {!terminal.includes(batch.status) && (
              <button onClick={stop} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-black text-primary"><Square size={13} aria-hidden="true" /> Stop</button>
            )}
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-muted">{settled} of {batch.requested} questions have finished every check.</p>
        {batch.error && <p className="mt-2 text-sm font-semibold text-error">{batch.error}</p>}
        {error && <p className="mt-2 text-sm font-semibold text-error">Connection problem: {error}. Retrying.</p>}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Totals">
        {[
          ["Written", totals.written, "text-primary"],
          ["Ready to publish", totals.autoPassed, "text-success"],
          ["Need a person", totals.needsReview, "text-warning"],
          ["Rejected", totals.rejected, "text-error"],
          ["In progress", totals.inFlight, "text-teal"]
        ].map(([label, value, color]) => (
          <div key={label as string} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
            <p className="text-xs font-black uppercase tracking-wide text-muted">{label}</p>
            <p className={`mt-1 text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Stages">
        <h2 className="mb-2 text-lg font-black text-primary">AI workers, stage by stage</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map((stage, index) => (
            <div key={stage.id} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-muted">Step {index + 1}</p>
                  <p className="font-black text-primary">{stage.label}</p>
                  <p className="text-xs font-semibold text-muted">{stage.detail}</p>
                </div>
                <p className="text-3xl font-black text-primary">{stage.passed}</p>
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
                {stage.id !== "write" && <div className="flex gap-1"><dt className="text-muted">Waiting</dt><dd className="text-primary">{stage.waiting}</dd></div>}
                {stage.askingAi > 0 && <div className="flex gap-1"><dt className="text-muted">Needs an AI answer</dt><dd className="text-warning">{stage.askingAi}</dd></div>}
                {stage.id !== "write" && <div className="flex gap-1"><dt className="text-muted">Fixed</dt><dd className="text-warning">{stage.fixed}</dd></div>}
                {stage.id !== "write" && <div className="flex gap-1"><dt className="text-muted">Rejected</dt><dd className="text-error">{stage.rejected}</dd></div>}
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs font-semibold text-muted">The big number is how many questions each worker has handled. Anything unsure goes to a person; nothing publishes by itself.</p>
      </section>

      {batch.status === "waiting_ai" || waiting.length > 0 ? <QueuePanel id={id} waiting={waiting} onChange={async () => { const response = await fetch(`/api/admin/factory/${id}`, { cache: "no-store" }); if (response.ok) apply(await response.json()); }} /> : null}

      <section className="rounded-2xl border border-border bg-white p-5 shadow-soft" aria-label="Live activity">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-primary">Live activity</h2>
          <Link href="/admin/questions?status=review" className="text-sm font-black text-primary underline">Open the review queue</Link>
        </div>
        {events.length === 0 ? (
          <p className="text-sm font-semibold text-muted">Nothing yet.</p>
        ) : (
          <ul className="grid gap-2">
            {events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-start gap-2 text-sm">
                <span className="w-16 shrink-0 font-mono text-xs text-muted">{new Date(event.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-black ${outcomeStyle[event.outcome] ?? outcomeStyle.info}`}>{outcomeLabel[event.outcome] ?? event.outcome}</span>
                <span className="font-black text-primary">{stageName[event.stage] ?? event.stage}</span>
                <span className="min-w-0 flex-1 font-semibold text-muted">{event.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QueuePanel({ id, waiting, onChange }: { id: string; waiting: Array<[string, number]>; onChange: () => Promise<void> }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [by, setBy] = useState("ChatGPT");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function copy(stage: string) {
    setMessage(null);
    const response = await fetch(`/api/admin/factory/${id}/tasks?stage=${stage}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok || !body.count) {
      setMessage({ ok: false, text: body.error ?? "There are no tasks for this stage right now." });
      return;
    }
    await navigator.clipboard.writeText(body.message);
    setCopied(stage);
    setMessage({ ok: true, text: `Copied ${body.count} tasks. Paste them into ${suggestedAi[stage] ?? "your AI chat"}, then paste its reply below.` });
    setTimeout(() => setCopied(null), 4000);
  }

  async function apply() {
    if (!reply.trim()) {
      setMessage({ ok: false, text: "Paste the chat's reply first." });
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/admin/factory/${id}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: reply, by }) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage({ ok: false, text: body.error ?? "Could not read that reply." });
      return;
    }
    setReply("");
    setMessage({ ok: true, text: `${body.applied} answers applied.${body.ignored ? ` ${body.ignored} did not match an open task and were skipped.` : ""} The run continues on its own.` });
    await onChange();
  }

  return (
    <section className="rounded-2xl border-2 border-amber-300 bg-amber-soft/40 p-5" aria-label="Chat queue">
      <h2 className="text-lg font-black text-primary">This run is waiting for AI answers</h2>
      <p className="mt-1 text-sm font-semibold text-muted">No API needed. Copy a batch of tasks, paste it into a chat you already pay for, then paste the reply back here. Use Claude to write and ChatGPT to check, so the checker is a different model from the writer.</p>
      <ol className="mt-4 grid gap-2">
        {waiting.map(([stage, count]) => (
          <li key={stage} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
            <span className="text-sm font-black text-primary">{stage === "review" ? "Review (spelling, grammar, syllabus)" : stageName[stage] ?? stage}: {count} waiting <span className="font-semibold text-muted">(suggested: {suggestedAi[stage] ?? "any chat"})</span></span>
            <button onClick={() => copy(stage)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-black text-primary">
              {copied === stage ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {copied === stage ? "Copied" : "Copy next tasks"}
            </button>
          </li>
        ))}
      </ol>
      <label className="mt-4 grid gap-1.5 text-sm font-black text-primary">
        Paste the reply here
        <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={5} placeholder='[{"id":"...","response":{...}}]' className="w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-xs" />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-black text-primary">
          Answered by
          <select value={by} onChange={(event) => setBy(event.target.value)} className="min-h-9 rounded-xl border border-border bg-white px-2 text-sm font-semibold">
            <option>ChatGPT</option>
            <option>Claude</option>
            <option>Other</option>
          </select>
        </label>
        <button onClick={apply} disabled={busy} className="min-h-10 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">{busy ? "Applying" : "Apply answers"}</button>
      </div>
      {message && <p role="status" className={`mt-3 text-sm font-bold ${message.ok ? "text-success" : "text-error"}`}>{message.text}</p>}
    </section>
  );
}
