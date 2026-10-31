import { Chart } from "@/components/chart";
import { Rich } from "@/components/rich-text";
import type { QuestionSet } from "@/lib/question-sets";

// The table or chart a data-set question is about, shown above the question.
export function SetStimulus({ set, label = "Data for this question" }: { set: QuestionSet; label?: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-black uppercase tracking-wide text-success">{label}</p>
      <p className="mt-1 text-sm font-black text-primary">{set.title}</p>
      {set.stimulus.trim() && <Rich text={set.stimulus} className="mt-2 text-base font-semibold leading-7 text-foreground" />}
      {set.chart && <Chart chart={set.chart} />}
    </div>
  );
}
