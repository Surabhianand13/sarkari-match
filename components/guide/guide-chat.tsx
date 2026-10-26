"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; deep?: boolean };

const starters = ["What should I study today?", "Explain my weakest topic with an example", "Quiz me on a topic I am weak in", "How do I improve my mock test score?"];

export function GuideChat({ examSlug, examName, initial, left: initialLeft }: { examSlug: string; examName: string; initial: Message[]; left: { fast: number; deep: number } }) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [left, setLeft] = useState(initialLeft);
  const [input, setInput] = useState("");
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError("");
    setBusy(true);
    setMessages((current) => [...current, { role: "user", content }]);
    setInput("");
    const response = await fetch(`/api/guide/${examSlug}/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: content, deep }) });
    const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string; left?: { fast: number; deep: number } };
    if (data.left) setLeft(data.left);
    if (response.ok && data.reply) setMessages((current) => [...current, { role: "assistant", content: data.reply!, deep }]);
    else setError(data.error ?? "Something went wrong. Please try again.");
    setBusy(false);
  }

  const outOfFast = left.fast <= 0;
  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-[32rem] max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-lift">
      <div className="flex items-center justify-between gap-3 bg-[linear-gradient(135deg,#0B2D63,#0D9488)] px-5 py-4 text-white">
        <div>
          <p className="flex items-center gap-2 font-black"><Sparkles size={18} aria-hidden="true" /> AI Study Guide · {examName}</p>
          <p className="text-xs font-semibold text-white/75">Knows your results for this exam. AI can make mistakes, so check important facts with the official notification.</p>
        </div>
        <p className="shrink-0 text-right text-xs font-bold text-white/80">{left.fast} messages left today</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-surface p-4">
        {!messages.length && (
          <div>
            <p className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-primary shadow-soft">Hi! I am your study guide for {examName}. Ask me what to study next, to explain a topic, or to quiz you.</p>
            <div className="mt-3 flex flex-wrap gap-2">{starters.map((starter) => <button key={starter} onClick={() => send(starter)} disabled={busy || outOfFast} className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-black text-primary hover:bg-mint disabled:opacity-50">{starter}</button>)}</div>
          </div>
        )}
        {messages.map((message, i) => (
          <div key={i} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <p className={`max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm font-semibold leading-6 ${message.role === "user" ? "bg-primary text-white" : "bg-white text-primary shadow-soft"}`}>{message.content}{message.deep && message.role === "assistant" && <span className="mt-1 block text-[0.65rem] font-black uppercase tracking-wide text-success">Deeper explanation</span>}</p>
          </div>
        ))}
        {busy && <p className="w-14 rounded-2xl bg-white px-3 py-2 text-center font-black text-muted shadow-soft">...</p>}
        <div ref={end} />
      </div>
      {error && <p role="alert" className="border-t border-border bg-red-50 px-4 py-2 text-sm font-bold text-error">{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="border-t border-border bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-muted">
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={deep} onChange={(event) => setDeep(event.target.checked)} disabled={left.deep <= 0} className="size-4" /> Explain deeper ({left.deep} left today)</label>
          {outOfFast && <span className="text-error">Daily limit reached. Resets tomorrow.</span>}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={800} placeholder="Ask your study guide" disabled={busy || outOfFast} className="min-h-12 flex-1 rounded-full border border-border px-4 text-sm font-semibold" />
          <button disabled={busy || outOfFast || !input.trim()} aria-label="Send" className="flex size-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] text-white disabled:opacity-50"><Send size={18} aria-hidden="true" /></button>
        </div>
      </form>
    </div>
  );
}
