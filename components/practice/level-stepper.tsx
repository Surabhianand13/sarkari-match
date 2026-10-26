import { Check, Lock } from "lucide-react";
import { LEVELS, type Level } from "@/lib/practice-shared";

export function LevelStepper({ level, goodSessions, compact = false }: { level: Level; goodSessions: number; compact?: boolean }) {
  const current = LEVELS.indexOf(level);
  return (
    <div>
      <ol className="flex items-center gap-2" aria-label="Practice level">
        {LEVELS.map((item, index) => (
          <li key={item} className="flex flex-1 items-center gap-2">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${index < current ? "bg-brand-green text-white" : index === current ? "bg-primary text-white ring-4 ring-primary/15" : "bg-surface text-muted"}`}>
              {index < current ? <Check size={15} aria-hidden="true" /> : index > current ? <Lock size={13} aria-hidden="true" /> : index + 1}
            </span>
            <span className={`text-xs font-black capitalize ${index === current ? "text-primary" : "text-muted"}`}>{item}</span>
            {index < LEVELS.length - 1 && <span className={`h-0.5 flex-1 rounded ${index < current ? "bg-brand-green" : "bg-border"}`} />}
          </li>
        ))}
      </ol>
      {!compact && level !== "advanced" && <p className="mt-2 text-xs font-semibold text-muted">Score 70% or more in {3 - goodSessions} more session{3 - goodSessions === 1 ? "" : "s"} in a row to move up.</p>}
    </div>
  );
}
