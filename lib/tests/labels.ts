import type { SeriesGroup, TestSummary } from "@/lib/tests/catalog";

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function groupLabel(group: Pick<SeriesGroup, "kind" | "level">) {
  const level = group.level ? `${cap(group.level)} ` : "";
  if (group.kind === "full") return `${level}full-length mocks`.trim().replace(/^./, (c) => c.toUpperCase());
  if (group.kind === "sectional") return `${level}subject tests`.trim().replace(/^./, (c) => c.toUpperCase());
  return `${level}topic tests`.trim().replace(/^./, (c) => c.toUpperCase());
}

export function groupHref(basePath: string, group: Pick<SeriesGroup, "kind" | "level">) {
  const params = new URLSearchParams({ kind: group.kind, level: group.level ?? "all" });
  return `${basePath}/tests?${params.toString()}`;
}

export function testBadges(test: Pick<TestSummary, "kind" | "level" | "subject" | "topic" | "isFreeSample">) {
  const badges: string[] = [];
  if (test.isFreeSample) badges.push("Free sample");
  if (test.level) badges.push(cap(test.level));
  if (test.kind === "sectional" && test.subject) badges.push(test.subject);
  if (test.kind === "topic") badges.push(test.topic ?? test.subject ?? "Topic");
  return badges;
}
