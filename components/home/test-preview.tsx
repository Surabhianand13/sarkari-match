import { Clock } from "lucide-react";

// Illustration of the exam window learners get. The question is a sample, not taken from any exam.
export function TestPreview() {
  const palette = [
    "bg-brand-green text-white", "bg-brand-green text-white", "bg-purple-600 text-white", "bg-orange-100 text-orange-800", "bg-brand-green text-white",
    "bg-surface text-muted", "bg-surface text-muted", "bg-orange-100 text-orange-800", "bg-surface text-muted", "bg-surface text-muted"
  ];
  return (
    <div className="rounded-[1.75rem] border border-border bg-white p-4 shadow-lift sm:p-5" aria-label="Preview of the mock test window" role="img">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-success">SSC CGL Tier I · Mock 1</p>
          <p className="text-sm font-black text-primary">Quantitative Aptitude</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-sm font-black text-success"><Clock size={15} aria-hidden="true" /> 42:18</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_8.5rem]">
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-muted">Question 7 of 100 · +2 / -0.5</p>
          <p className="mt-2 text-sm font-bold leading-6 text-foreground">A shopkeeper buys an article for ₹800 and sells it for ₹920. What is the profit percent?</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold">
            {[["A", "12%", false], ["B", "15%", true], ["C", "18%", false], ["D", "20%", false]].map(([key, text, picked]) => (
              <div key={key as string} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${picked ? "border-brand-green bg-mint text-primary" : "border-border bg-white text-muted"}`}>
                <span className={`flex size-5 items-center justify-center rounded-full text-[0.65rem] font-black ${picked ? "bg-brand-green text-white" : "bg-surface text-primary"}`}>{key as string}</span>{text as string}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-surface p-3">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-muted">Palette</p>
          <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-3">
            {palette.map((tone, index) => <span key={index} className={`flex h-7 items-center justify-center rounded-md text-xs font-black ${tone}`}>{index + 1}</span>)}
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[0.7rem] font-bold text-muted">Timed like the real exam · saved as you go · full solutions after you submit</p>
    </div>
  );
}
