import { monthYearLabel } from "@/lib/freshness";
import type { Lang } from "@/lib/localize";

// "Current affairs · October 2026": when the fact in a current-affairs question is from, shown above the question.
export function FactMonth({ value, lang = "en" }: { value: string | null | undefined; lang?: Lang }) {
  const label = monthYearLabel(value, lang);
  if (!label) return null;
  return (
    <p className="mb-2 inline-flex rounded-full bg-amber-soft px-3 py-1 text-xs font-black text-warning" lang={lang}>
      {lang === "hi" ? "समसामयिकी" : "Current affairs"} · {label}
    </p>
  );
}
