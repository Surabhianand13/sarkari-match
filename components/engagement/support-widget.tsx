"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const hiddenPrefixes = ["/admin", "/tests/attempt", "/practice/"];
const starters = ["What is in the SSC CGL test series?", "How does adaptive practice work?", "Can I try before paying?"];

function WhatsAppIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .17 5.33.17 11.88c0 2.1.55 4.14 1.6 5.95L0 24l6.34-1.66a11.84 11.84 0 0 0 5.7 1.45h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.23-6.15-3.41-8.43ZM12.05 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.76.99 1-3.67-.24-.38a9.88 9.88 0 0 1-1.52-5.27c0-5.46 4.45-9.9 9.92-9.9 2.65 0 5.14 1.03 7.01 2.9a9.84 9.84 0 0 1 2.9 7.01c0 5.46-4.45 9.9-9.9 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.88.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

export function SupportWidget({ whatsappNumber, assistant }: { whatsappNumber: string | null; assistant: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const hidden = hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [messages, open]);

  if (hidden || (!whatsappNumber && !assistant)) return null;

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const data = (await response.json().catch(() => ({}))) as { reply?: string; error?: string };
      setMessages([...next, { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong. Please try again." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "I could not reach the server. Please try again." }]);
    }
    setBusy(false);
  }

  const waHref = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hi, I have a question about the Sarkari Match test series.")}` : null;

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3 md:bottom-6">
      {open && assistant && (
        <div role="dialog" aria-label="Ask Sarkari Match" className="flex h-[26rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-lift">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#0B2D63,#0D9488)] px-4 py-3 text-white">
            <p className="flex items-center gap-2 font-black"><Sparkles size={16} aria-hidden="true" /> Ask Sarkari Match</p>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full p-1 hover:bg-white/15"><X size={18} aria-hidden="true" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            <p className="rounded-2xl bg-surface px-3 py-2 font-semibold text-primary">Hi! Ask me about the test series, practice, your study plan or exam pattern. I am an AI assistant and can make mistakes.</p>
            {messages.map((message, i) => (
              <p key={i} className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 font-semibold ${message.role === "user" ? "ml-auto bg-primary text-white" : "bg-surface text-primary"}`}>{message.content}</p>
            ))}
            {!messages.length && <div className="flex flex-wrap gap-2">{starters.map((starter) => <button key={starter} onClick={() => send(starter)} className="rounded-full border border-border px-3 py-1.5 text-xs font-black text-primary hover:bg-mint">{starter}</button>)}</div>}
            {busy && <p className="w-16 rounded-2xl bg-surface px-3 py-2 text-center font-black text-muted">...</p>}
            <div ref={end} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="flex gap-2 border-t border-border p-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={800} placeholder="Type your question" className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm font-semibold" />
            <button disabled={busy || !input.trim()} aria-label="Send" className="flex size-11 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"><Send size={17} aria-hidden="true" /></button>
          </form>
        </div>
      )}
      <div className="flex items-center gap-3">
        {assistant && !open && (
          <button onClick={() => setOpen(true)} className="flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-black text-white shadow-lift"><MessageCircle size={18} aria-hidden="true" /> Ask AI</button>
        )}
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp" className="animate-pulse-ring flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lift transition hover:scale-105">
            <WhatsAppIcon />
          </a>
        )}
      </div>
    </div>
  );
}
