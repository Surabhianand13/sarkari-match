import Link from "next/link";
import type { Route } from "next";
import { testBadges } from "@/lib/tests/labels";
import type { TestSummary } from "@/lib/tests/catalog";

export function TestRow({ test, basePath }: { test: TestSummary; basePath: string }) {
  return (
    <Link href={`${basePath}/${test.slug}` as Route} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5">
      <span>
        <span className="block font-black text-primary">{test.title}</span>
        <span className="text-sm text-muted">{test.questionCount} questions · {test.durationMinutes} min · {test.negativeMarks} negative marks</span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        {testBadges(test).map((badge) => <span key={badge} className={`rounded-full px-3 py-1 text-xs font-black ${badge === "Free sample" ? "bg-mint text-success" : "bg-surface text-muted"}`}>{badge}</span>)}
      </span>
    </Link>
  );
}
