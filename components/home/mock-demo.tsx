"use client";

import { useEffect, useState } from "react";
import { Check, Clock, X } from "lucide-react";

type Sample = { section: string; question: string; options: string[]; correct: number; pick: number };

// Original sample questions for the animation only. They are not taken from any exam paper.
const samples: Sample[] = [
  { section: "Quantitative Aptitude", question: "A shopkeeper buys an article for ₹800 and sells it for ₹920. What is the profit percent?", options: ["12%", "15%", "18%", "20%"], correct: 1, pick: 1 },
  { section: "Reasoning", question: "Find the next number in the series: 3, 6, 12, 24, ?", options: ["36", "42", "48", "54"], correct: 2, pick: 1 },
  { section: "English", question: "Choose the word closest in meaning to “Candid”.", options: ["Frank", "Secretive", "Careless", "Timid"], correct: 0, pick: 0 },
  { section: "Quantitative Aptitude", question: "8 workers finish a job in 12 days. How many days will 6 workers take?", options: ["14", "16", "18", "20"], correct: 1, pick: 1 }
];

const PALETTE = 20;

// A self-playing mini mock test: timer ticks, answers are picked and marked, the palette fills, accuracy updates.
// Purely illustrative, so it is labelled as a sample and aria-hidden.
export function MockDemo() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [results, setResults] = useState<Array<boolean | null>>(() => Array(PALETTE).fill(null));
  const [seconds, setSeconds] = useState(58 * 60 + 41);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setPhase(2);
    }
  }, []);

  useEffect(() => {
    if (still) return;
    const tick = setInterval(() => setSeconds((value) => (value > 60 ? value - 1 : 58 * 60 + 41)), 1000);
    return () => clearInterval(tick);
  }, [still]);

  useEffect(() => {
    if (still) return;
    const delay = phase === 0 ? 1700 : phase === 1 ? 1100 : 2300;
    const timer = setTimeout(() => {
      if (phase === 0) setPhase(1);
      else if (phase === 1) {
        const sample = samples[index % samples.length];
        setResults((current) => {
          const slot = index % PALETTE;
          const next = slot === 0 ? Array<boolean | null>(PALETTE).fill(null) : current.slice();
          next[slot] = sample.pick === sample.correct;
          return next;
        });
        setPhase(2);
      } else {
        setIndex((value) => value + 1);
        setPhase(0);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, index, still]);

  const sample = samples[index % samples.length];
  const answered = results.filter((value) => value !== null);
  const correct = answered.filter(Boolean).length;
  const accuracy = answered.length ? Math.round((correct / answered.length) * 100) : 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="blob-morph absolute -inset-6 -z-10 bg-[linear-gradient(135deg,rgba(24,185,67,0.22),rgba(13,148,136,0.18),rgba(99,102,241,0.16))] blur-2xl" />
      <div className="rounded-[1.75rem] border border-border bg-white p-4 shadow-lift sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-success">Sample mock · SSC CGL Tier I</p>
            <p key={sample.section + index} className="slide-up-fade text-sm font-black text-primary">{sample.section}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-sm font-black tabular-nums text-success"><Clock size={15} />{mm}:{ss}</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_8.5rem]">
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-[0.65rem] font-black uppercase tracking-wide text-muted">Question {(index % PALETTE) + 1} of 100 · +2 / -0.5</p>
            <p key={index} className="slide-up-fade mt-2 min-h-[4.5rem] text-sm font-bold leading-6 text-foreground">{sample.question}</p>
            <div className="mt-3 grid gap-2">
              {sample.options.map((option, i) => {
                const picked = phase >= 1 && i === sample.pick;
                const revealed = phase === 2;
                const isRight = revealed && i === sample.correct;
                const isWrong = revealed && picked && i !== sample.correct;
                const tone = isRight ? "border-brand-green bg-mint text-primary" : isWrong ? "border-error bg-red-50 text-primary" : picked ? "border-primary bg-white text-primary" : "border-border bg-white text-muted";
                return (
                  <div key={option} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors duration-300 ${tone}`}>
                    <span className={`flex size-5 items-center justify-center rounded-full text-[0.65rem] font-black ${isRight ? "bg-brand-green text-white" : isWrong ? "bg-error text-white" : picked ? "bg-primary text-white" : "bg-surface text-primary"}`}>{String.fromCharCode(65 + i)}</span>
                    <span className="flex-1">{option}</span>
                    {isRight && <Check size={16} className="pop-in text-success" />}
                    {isWrong && <X size={16} className="pop-in text-error" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-3">
            <div className="relative mx-auto size-20">
              <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#DDE5EE" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#18B943" strokeWidth="3" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - accuracy} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center text-sm font-black leading-none text-primary tabular-nums">{accuracy}%<span className="mt-0.5 text-[0.5rem] font-bold uppercase tracking-wide text-muted">accuracy</span></span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1">
              {results.map((value, i) => (
                <span key={i} className={`flex h-5 items-center justify-center rounded text-[0.55rem] font-black transition-colors duration-300 ${value === null ? "bg-white text-muted" : value ? "bg-brand-green text-white" : "bg-error text-white"}`}>{i + 1}</span>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[0.7rem] font-bold text-muted">Sample animation · timed like the real exam · solutions after you submit</p>
      </div>
    </div>
  );
}
