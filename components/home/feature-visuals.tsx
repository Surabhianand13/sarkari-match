import { Check, Lock } from "lucide-react";

// Small illustrations of the product used in the home page feature sections. The numbers are samples, not live data.
export function AdaptiveVisual() {
  const steps = [["Beginner", "done"], ["Intermediate", "current"], ["Advanced", "locked"]] as const;
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lift" aria-hidden="true">
      <p className="text-xs font-black uppercase tracking-wide text-muted">Quantitative Aptitude</p>
      <ol className="mt-5 grid gap-3">
        {steps.map(([name, state], i) => (
          <li key={name} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${state === "current" ? "border-brand-green bg-mint" : "border-border"}`}>
            <span className={`flex size-8 items-center justify-center rounded-full text-sm font-black ${state === "done" ? "bg-brand-green text-white" : state === "current" ? "bg-primary text-white" : "bg-surface text-muted"}`}>
              {state === "done" ? <Check size={16} /> : state === "locked" ? <Lock size={14} /> : i + 1}
            </span>
            <span className="flex-1 font-black text-primary">{name}</span>
            {state === "current" && <span className="text-xs font-black text-success">2 of 3 sessions</span>}
          </li>
        ))}
      </ol>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#18B943,#0D9488)] sheen relative" /></div>
      <p className="mt-2 text-xs font-bold text-muted">Score 70% or more three sessions in a row to move up.</p>
    </div>
  );
}

export function PlanVisual() {
  const days = [["1", "Percentage"], ["2", "Ratio"], ["3", "Series"], ["4", "Mixed"], ["5", "Mock"], ["6", "Review"], ["7", "Revise"]];
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lift" aria-hidden="true">
      <p className="text-xs font-black uppercase tracking-wide text-muted">This week</p>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map(([day, label], i) => (
          <div key={day} className={`animate-float rounded-2xl px-1 py-3 text-center ${i === 2 ? "bg-primary text-white" : "bg-surface text-primary"}`} style={{ animationDelay: `${i * 220}ms`, animationDuration: "5s" }}>
            <p className="text-[0.65rem] font-black uppercase opacity-70">Day</p>
            <p className="text-lg font-black">{day}</p>
            <p className="mt-1 truncate text-[0.6rem] font-bold">{label}</p>
          </div>
        ))}
      </div>
      <ul className="mt-5 grid gap-2 text-sm font-semibold text-primary">
        <li className="flex items-center justify-between rounded-xl bg-mint px-3 py-2">Practise Series, 25 min <span className="text-xs font-black text-success">Today</span></li>
        <li className="flex items-center justify-between rounded-xl bg-surface px-3 py-2">Recap Percentage, 15 min <span className="text-xs font-black text-muted">Today</span></li>
      </ul>
    </div>
  );
}

export function InsightsVisual() {
  const bars = [48, 55, 52, 63, 70, 76, 82];
  return (
    <div className="rounded-3xl bg-white p-6 shadow-lift" aria-hidden="true">
      <div className="flex items-end justify-between">
        <div><p className="text-xs font-black uppercase tracking-wide text-muted">Mock test score</p><p className="text-3xl font-black text-primary">82%</p></div>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-success">+34 pts in 7 tests</span>
      </div>
      <div className="mt-5 flex h-36 items-end gap-2">
        {bars.map((value, i) => <div key={i} className="bar-grow flex-1 rounded-t-lg bg-[linear-gradient(180deg,#18B943,#0D9488)]" style={{ height: `${value}%`, animationDelay: `${i * 120}ms` }} />)}
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }, (_, i) => <span key={i} className="aspect-square rounded-sm" style={{ background: [1, 2, 4, 5, 8, 9, 11, 12, 15, 16, 17, 20, 22, 23, 24, 26, 27].includes(i) ? `rgba(24,185,67,${0.35 + ((i * 7) % 5) * 0.13})` : "#EEF2F7" }} />)}
      </div>
    </div>
  );
}
