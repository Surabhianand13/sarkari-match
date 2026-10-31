"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Clock, LayoutGrid } from "lucide-react";
import { Inline, Rich } from "@/components/rich-text";
import type { PlayerData } from "@/lib/tests/attempts";

type AnswerState = { selected: string | null; marked: boolean };

function format(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TestPlayer({ data }: { data: PlayerData }) {
  const router = useRouter();
  const { questions } = data;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => data.answers);
  const [visited, setVisited] = useState<Set<string>>(() => new Set([questions[0]?.id, ...Object.keys(data.answers)].filter(Boolean) as string[]));
  const [showPalette, setShowPalette] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const offset = useRef(new Date(data.serverNow).getTime() - Date.now());
  const deadline = new Date(data.deadlineAt).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.round((deadline - (Date.now() + offset.current)) / 1000)));
  const enteredAt = useRef(Date.now());
  const submitted = useRef(false);

  const sections = useMemo(() => {
    const list: Array<{ name: string; first: number; count: number }> = [];
    questions.forEach((question, position) => {
      const last = list[list.length - 1];
      if (last && last.name === question.section) last.count++;
      else list.push({ name: question.section, first: position, count: 1 });
    });
    return list;
  }, [questions]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    const response = await fetch(`/api/tests/attempts/${data.attemptId}/submit`, { method: "POST" });
    const result = (await response.json().catch(() => ({}))) as { resultUrl?: string; error?: string };
    if (response.ok && result.resultUrl) {
      router.replace(result.resultUrl as Route);
      return;
    }
    submitted.current = false;
    setSubmitting(false);
    setError(result.error ?? "Could not submit. Check your connection and try again.");
  }, [data.attemptId, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.round((deadline - (Date.now() + offset.current)) / 1000);
      setRemaining(Math.max(0, left));
      if (left <= 0) void submit();
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, submit]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!submitted.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const current = questions[index];

  const save = useCallback(
    async (questionId: string, next: AnswerState) => {
      const spent = Math.round((Date.now() - enteredAt.current) / 1000);
      enteredAt.current = Date.now();
      try {
        const response = await fetch(`/api/tests/attempts/${data.attemptId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId, selected: next.selected, marked: next.marked, timeSpentSeconds: spent })
        });
        if (response.status === 409) {
          router.replace(`/tests/attempt/${data.attemptId}/result` as Route);
          return;
        }
        setSaveFailed(!response.ok);
      } catch {
        setSaveFailed(true);
      }
    },
    [data.attemptId, router]
  );

  function update(questionId: string, patch: Partial<AnswerState>) {
    const next = { selected: answers[questionId]?.selected ?? null, marked: answers[questionId]?.marked ?? false, ...patch };
    setAnswers((existing) => ({ ...existing, [questionId]: next }));
    void save(questionId, next);
  }

  function go(position: number) {
    const target = Math.min(Math.max(position, 0), questions.length - 1);
    setIndex(target);
    setVisited((existing) => new Set(existing).add(questions[target].id));
    enteredAt.current = Date.now();
    setShowPalette(false);
  }

  const counts = useMemo(() => {
    let answered = 0;
    let marked = 0;
    for (const question of questions) {
      if (answers[question.id]?.selected) answered++;
      if (answers[question.id]?.marked) marked++;
    }
    return { answered, marked, notAnswered: questions.length - answered };
  }, [answers, questions]);

  if (!current) return <p className="p-6 text-center font-bold text-muted">This test has no questions.</p>;
  const selected = answers[current.id]?.selected ?? null;
  const low = remaining <= 300;

  const palette = (
    <div>
      {sections.map((section) => (
        <div key={section.name} className="mb-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted">{section.name}</p>
          <div className="grid grid-cols-5 gap-2">
            {questions.slice(section.first, section.first + section.count).map((question, offsetInSection) => {
              const position = section.first + offsetInSection;
              const state = answers[question.id];
              const tone = state?.marked ? "bg-purple-600 text-white" : state?.selected ? "bg-brand-green text-white" : visited.has(question.id) ? "bg-orange-100 text-orange-800" : "bg-surface text-muted";
              return (
                <button key={question.id} onClick={() => go(position)} aria-label={`Question ${position + 1}`} aria-current={position === index ? "true" : undefined} className={`min-h-10 rounded-lg text-sm font-black ${tone} ${position === index ? "ring-2 ring-primary" : ""}`}>
                  {position + 1}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <ul className="grid gap-1 text-xs font-semibold text-muted">
        <li><span className="mr-2 inline-block size-3 rounded bg-brand-green align-middle" />Answered ({counts.answered})</li>
        <li><span className="mr-2 inline-block size-3 rounded bg-orange-100 align-middle" />Seen, not answered</li>
        <li><span className="mr-2 inline-block size-3 rounded bg-purple-600 align-middle" />Marked for review ({counts.marked})</li>
        <li><span className="mr-2 inline-block size-3 rounded bg-surface align-middle ring-1 ring-border" />Not visited</li>
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface pb-28 lg:pb-8">
      <div className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-wide text-success">{data.seriesTitle}</p>
            <h1 className="truncate text-base font-black text-primary sm:text-lg">{data.testTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span role="timer" aria-live="off" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-black ${low ? "bg-red-50 text-error" : "bg-mint text-success"}`}>
              <Clock size={16} aria-hidden="true" /> {format(remaining)}
            </span>
            <button onClick={() => setShowPalette(true)} className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-white text-primary lg:hidden" aria-label="Question palette"><LayoutGrid size={18} aria-hidden="true" /></button>
            <button onClick={() => setConfirming(true)} className="hidden min-h-10 rounded-full bg-primary px-4 text-sm font-black text-white lg:inline-flex lg:items-center">Submit test</button>
          </div>
        </div>
        {sections.length > 1 && (
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-2">
            {sections.map((section) => {
              const active = index >= section.first && index < section.first + section.count;
              return <button key={section.name} onClick={() => go(section.first)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-primary text-white" : "bg-surface text-primary"}`}>{section.name}</button>;
            })}
          </div>
        )}
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 lg:grid-cols-[1fr_17rem]">
        <section className="rounded-3xl bg-white p-5 shadow-soft sm:p-7" aria-live="polite">
          <p className="text-xs font-black uppercase tracking-wide text-muted">Question {index + 1} of {questions.length} · {current.section} · +{current.marks} / -{data.negativeMarks}</p>
          <Rich text={current.stem} className="mt-3 text-lg font-bold leading-8 text-foreground" />
          <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Options">
            {["A", "B", "C", "D"].map((key) => (
              <button key={key} role="radio" aria-checked={selected === key} onClick={() => update(current.id, { selected: key })} className={`flex min-h-12 items-start gap-3 rounded-2xl border px-4 py-3 text-left text-base font-semibold ${selected === key ? "border-brand-green bg-mint text-primary" : "border-border bg-white text-foreground hover:bg-surface"}`}>
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${selected === key ? "bg-brand-green text-white" : "bg-surface text-primary"}`}>{key}</span>
                <span className="pt-0.5"><Inline text={current.options[key]} /></span>
              </button>
            ))}
          </div>
          {saveFailed && <p role="alert" className="mt-3 text-sm font-bold text-error">Your last answer could not be saved. Check your connection; it will retry when you change an answer.</p>}
          {error && <p role="alert" className="mt-3 text-sm font-bold text-error">{error}</p>}
        </section>

        <aside className="hidden rounded-3xl bg-white p-5 shadow-soft lg:block">{palette}</aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 p-3 backdrop-blur lg:static lg:mx-auto lg:max-w-6xl lg:border-0 lg:bg-transparent lg:px-4 lg:py-0">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button onClick={() => go(index - 1)} disabled={index === 0} className="min-h-11 rounded-full border border-border bg-white px-4 text-sm font-black text-primary disabled:opacity-40">Previous</button>
          <button onClick={() => { update(current.id, { selected: null, marked: false }); }} className="min-h-11 rounded-full border border-border bg-white px-4 text-sm font-black text-primary">Clear</button>
          <button onClick={() => { update(current.id, { marked: true }); go(index + 1); }} className="min-h-11 rounded-full border border-purple-300 bg-purple-50 px-4 text-sm font-black text-purple-800">Mark for review &amp; next</button>
          <button onClick={() => go(index + 1)} disabled={index === questions.length - 1} className="min-h-11 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green disabled:opacity-40">Save &amp; next</button>
          <button onClick={() => setConfirming(true)} className="col-span-2 min-h-11 rounded-full bg-primary px-5 text-sm font-black text-white sm:hidden">Submit test</button>
        </div>
      </div>

      {showPalette && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setShowPalette(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><p className="font-black text-primary">Questions</p><button onClick={() => setShowPalette(false)} className="text-sm font-black text-primary underline">Close</button></div>
            {palette}
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Submit test">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6">
            <h2 className="text-xl font-black text-primary">Submit the test?</h2>
            <ul className="mt-3 grid gap-1 text-sm font-semibold text-muted">
              <li>Answered: {counts.answered}</li>
              <li>Not answered: {counts.notAnswered}</li>
              <li>Marked for review: {counts.marked}</li>
              <li>Time left: {format(remaining)}</li>
            </ul>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirming(false)} className="min-h-11 flex-1 rounded-full border border-border px-4 text-sm font-black text-primary">Go back</button>
              <button onClick={() => void submit()} disabled={submitting} className="min-h-11 flex-1 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-4 text-sm font-black text-white disabled:opacity-60">{submitting ? "Submitting..." : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
