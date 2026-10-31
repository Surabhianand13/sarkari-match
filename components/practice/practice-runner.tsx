"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { LevelStepper } from "@/components/practice/level-stepper";
import { Inline, Rich } from "@/components/rich-text";
import { SolutionText } from "@/components/solution-text";
import type { Level, PracticeSession } from "@/lib/practice-shared";

type Feedback = { correct: boolean; correctOption: string; explanation: string };
type Finished = { score: number; total: number; percent: number; levelBefore: Level; levelAfter: Level; goodSessions: number; promoted: boolean };

export function PracticeRunner({ session }: { session: PracticeSession }) {
  const firstOpen = session.questions.findIndex((question) => !question.selected);
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>(() =>
    Object.fromEntries(session.questions.filter((q) => q.selected && q.correctOption).map((q) => [q.id, { correct: q.selected === q.correctOption, correctOption: q.correctOption!, explanation: q.explanation ?? "" }]))
  );
  const [picked, setPicked] = useState<Record<string, string>>(() => Object.fromEntries(session.questions.filter((q) => q.selected).map((q) => [q.id, q.selected!])));
  const [finished, setFinished] = useState<Finished | null>(null);
  const [showSummary, setShowSummary] = useState(session.status === "completed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const question = session.questions[index];
  const answered = Boolean(feedback[question?.id]);
  const done = showSummary;
  const correctCount = Object.values(feedback).filter((item) => item.correct).length;

  async function choose(option: string) {
    if (answered || busy) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/practice/${session.id}/answer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: question.id, selected: option }) });
    const data = (await response.json().catch(() => ({}))) as Feedback & { finished?: Finished | null; error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Could not save that answer.");
      return;
    }
    setPicked((current) => ({ ...current, [question.id]: option }));
    setFeedback((current) => ({ ...current, [question.id]: { correct: data.correct, correctOption: data.correctOption, explanation: data.explanation } }));
    if (data.finished) setFinished(data.finished);
  }

  if (done) {
    const score = finished?.score ?? session.correct;
    const total = finished?.total ?? session.total;
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl bg-white p-6 text-center shadow-soft sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-success">Session complete</p>
          <p className="mt-3 text-6xl font-black text-primary">{score}<span className="text-3xl text-muted">/{total}</span></p>
          <p className="mt-1 font-bold text-muted">{session.subject}{session.topic ? ` · ${session.topic}` : ""}</p>
          {finished && (
            <div className="mt-6 text-left">
              {finished.promoted && <p className="mb-3 rounded-2xl bg-mint px-4 py-3 text-center font-black text-success">You moved up to {finished.levelAfter}.</p>}
              <LevelStepper level={finished.levelAfter} goodSessions={finished.goodSessions} />
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/practice" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-6 font-black text-white">Practise again</Link>
            <Link href="/dashboard/progress" className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-white px-6 font-black text-primary">See my progress</Link>
          </div>
        </div>
      </div>
    );
  }

  const current = feedback[question.id];
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between text-sm font-black text-primary">
        <span>{session.subject}{session.topic ? ` · ${session.topic}` : ""}</span>
        <span className="capitalize text-muted">{session.level}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={session.total} aria-valuenow={Object.keys(feedback).length}>
        <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${(Object.keys(feedback).length / session.total) * 100}%` }} />
      </div>
      <p className="mt-2 text-xs font-bold text-muted">Question {index + 1} of {session.total} · {correctCount} correct so far</p>
      <div className="mt-5 rounded-3xl bg-white p-6 shadow-soft">
        <Rich text={question.stem} className="text-lg font-bold leading-8 text-foreground" />
        <div className="mt-5 grid gap-3">
          {(["A", "B", "C", "D"] as const).map((key) => {
            const isPicked = picked[question.id] === key;
            const isCorrect = current?.correctOption === key;
            const tone = !current ? "border-border hover:border-brand-green hover:bg-mint" : isCorrect ? "border-brand-green bg-mint" : isPicked ? "border-error bg-red-50" : "border-border opacity-70";
            return (
              <button key={key} onClick={() => choose(key)} disabled={answered || busy} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-semibold transition ${tone}`}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-black text-primary">{key}</span>
                <span className="flex-1"><Inline text={question.options[key]} /></span>
                {current && isCorrect && <CheckCircle2 className="text-success" size={20} aria-hidden="true" />}
                {current && isPicked && !isCorrect && <XCircle className="text-error" size={20} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-bold text-error">{error}</p>}
        {current && (
          <div className="mt-5 rounded-2xl bg-surface p-4">
            <p className={`font-black ${current.correct ? "text-success" : "text-error"}`}>{current.correct ? "Correct" : `Not quite. The answer is ${current.correctOption}.`}</p>
            <div className="mt-2 text-sm leading-6 text-muted"><SolutionText text={current.explanation} /></div>
          </div>
        )}
      </div>
      {current && index < session.questions.length - 1 && (
        <button onClick={() => setIndex(index + 1)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-black text-white">Next question</button>
      )}
      {current && finished && (
        <button onClick={() => setShowSummary(true)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] font-black text-white">See my results</button>
      )}
    </div>
  );
}
