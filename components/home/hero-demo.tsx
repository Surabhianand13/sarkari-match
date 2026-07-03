"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { T } from "@/components/i18n/t";

type SearchResult = { title: string; badge: string; tone: "strong" | "possible" };

type Frame =
  | { scene: "search"; query: string; results?: SearchResult[] }
  | {
      scene: "eligibility";
      qualification?: string;
      age?: string;
      category?: string;
      checking?: boolean;
      results?: string[];
    };

function typingFrames(word: string, holdMs: number, results?: SearchResult[]): Frame[] {
  const frames: Frame[] = [];
  for (let i = 1; i <= word.length; i += 1) {
    frames.push({ scene: "search", query: word.slice(0, i) });
  }
  frames.push({ scene: "search", query: word, results });
  for (let i = word.length; i >= 0; i -= 1) {
    frames.push({ scene: "search", query: word.slice(0, i) });
  }
  return frames.map((frame, index) => ({ ...frame, __duration: index === word.length ? holdMs : 90 }) as Frame & { __duration: number });
}

const script: (Frame & { __duration?: number })[] = [
  { scene: "search", query: "", __duration: 500 },
  ...typingFrames("UPSC", 2200, [
    { title: "UPSC Civil Services 2026", badge: "Strong Match", tone: "strong" },
    { title: "UPSC Combined Medical Services", badge: "Possible Match", tone: "possible" }
  ]),
  ...typingFrames("IAS", 2200, [{ title: "IAS-track Civil Services 2026", badge: "Strong Match", tone: "strong" }]),
  { scene: "eligibility", __duration: 500 },
  { scene: "eligibility", qualification: "Graduate", __duration: 650 },
  { scene: "eligibility", qualification: "Graduate", age: "24", __duration: 650 },
  { scene: "eligibility", qualification: "Graduate", age: "24", category: "General", __duration: 650 },
  { scene: "eligibility", qualification: "Graduate", age: "24", category: "General", checking: true, __duration: 700 },
  {
    scene: "eligibility",
    qualification: "Graduate",
    age: "24",
    category: "General",
    results: ["SSC Assistant Officer", "Railway Technician", "UPSC Civil Services 2026"],
    __duration: 2600
  }
];

export function HeroDemo() {
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stepRef = useRef(0);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    if (query.matches) return;

    let cancelled = false;
    async function run() {
      while (!cancelled) {
        const frame = script[stepRef.current];
        await new Promise((resolve) => setTimeout(resolve, frame.__duration ?? 120));
        if (cancelled) return;
        stepRef.current = (stepRef.current + 1) % script.length;
        setStep(stepRef.current);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const frame = reducedMotion ? script[script.length - 1] : script[step];

  return (
    <div className="mx-auto w-full max-w-md rounded-[1.75rem] border border-[color:var(--border)] bg-white p-5 shadow-lift" aria-label="Preview of how SarkariMatch matches govt job and exam notifications" role="img">
      {frame.scene === "search" ? (
        <SearchScene frame={frame} />
      ) : (
        <EligibilityScene frame={frame} />
      )}
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[0.7rem] font-black uppercase tracking-wide text-muted">
        <ShieldCheck size={13} className="text-teal" aria-hidden="true" /> <T k="demo_tagline" />
      </p>
    </div>
  );
}

function SearchScene({ frame }: { frame: Extract<Frame, { scene: "search" }> }) {
  return (
    <div className="min-h-[168px]">
      <div className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-surface px-4 py-3">
        <Search size={16} className="text-muted" aria-hidden="true" />
        <span className="text-sm font-semibold text-primary">
          {frame.query}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {(frame.results ?? []).map((result) => (
          <div key={result.title} className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2.5">
            <p className="text-xs font-black text-primary">{result.title}</p>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[0.65rem] font-black ${result.tone === "strong" ? "bg-mint text-success" : "bg-amber-soft text-warning"}`}>{result.badge}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EligibilityScene({ frame }: { frame: Extract<Frame, { scene: "eligibility" }> }) {
  const fields: [string, string | undefined][] = [
    ["Qualification", frame.qualification],
    ["Age", frame.age],
    ["Category", frame.category]
  ];
  return (
    <div className="min-h-[168px]">
      {!frame.results ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {fields.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-surface p-2.5">
                <p className="text-[0.6rem] font-black uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 min-h-[1.1rem] text-xs font-black text-primary">{value ?? ""}</p>
              </div>
            ))}
          </div>
          {frame.checking && (
            <p className="mt-3 text-center text-xs font-bold text-muted">Checking eligibility rules…</p>
          )}
        </>
      ) : (
        <div className="grid gap-2">
          <p className="text-xs font-black text-success">{frame.results.length} eligible notifications found</p>
          {frame.results.map((title) => (
            <div key={title} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5">
              <CheckCircle2 size={15} className="shrink-0 text-success" aria-hidden="true" />
              <p className="text-xs font-black text-primary">{title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
