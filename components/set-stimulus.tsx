import { Chart } from "@/components/chart";
import { Rich } from "@/components/rich-text";
import { setLabels, type QuestionSet } from "@/lib/question-sets";

// What a set's questions are about, shown above each question: a table or chart, or a passage in a box that scrolls so a
// long passage does not push the question off the screen.
export function SetStimulus({ set, label }: { set: QuestionSet; label?: string }) {
  const passage = set.kind !== "data";
  return (
    <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-black uppercase tracking-wide text-success">{label ?? setLabels[set.kind].label}</p>
      <p className="mt-1 text-sm font-black text-primary">{set.title}</p>
      {set.stimulus.trim() && (
        <div className={passage ? "mt-2 max-h-72 overflow-y-auto rounded-xl bg-white p-3" : undefined} tabIndex={passage ? 0 : undefined} aria-label={passage ? `${set.title}, scrollable passage` : undefined}>
          <Rich text={set.stimulus} className={passage ? "grid gap-3 text-base leading-7 text-foreground" : "mt-2 text-base font-semibold leading-7 text-foreground"} />
        </div>
      )}
      {set.chart && <Chart chart={set.chart} />}
    </div>
  );
}
