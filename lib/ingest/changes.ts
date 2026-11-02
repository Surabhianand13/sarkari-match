import type { ParsedLead } from "@/lib/ingest/parse";

// What changed on a notification's own page between two readings of it. A revised last date or vacancy count is the usual one.
export type Change = { field: string; label: string; from: string; to: string };
export type SourceUpdate = { at: string; site: string; url: string; changes: Change[] };

const tracked: Array<[keyof ParsedLead, string]> = [
  ["applicationEndDate", "Last date"],
  ["applicationStartDate", "Start date"],
  ["vacancyCount", "Vacancies"],
  ["notificationNumber", "Notification number"],
  ["officialNotificationUrl", "Official notification link"],
  ["officialApplicationUrl", "Official apply link"],
  ["salaryText", "Salary"]
];

const same = (a: unknown, b: unknown) => String(a).replace(/\s+/g, " ").trim().toLowerCase() === String(b).replace(/\s+/g, " ").trim().toLowerCase();

// Only a value that was read both times and differs counts. A field the page did not give before is new information, not a change.
export function diffParsed(before: Partial<ParsedLead> | undefined, after: Partial<ParsedLead>): Change[] {
  if (!before) return [];
  const changes: Change[] = [];
  for (const [field, label] of tracked) {
    const from = before[field];
    const to = after[field];
    if (from === undefined || from === null || from === "" || to === undefined || to === null || to === "") continue;
    if (!same(from, to)) changes.push({ field, label, from: String(from), to: String(to) });
  }
  return changes;
}

// The fields of a recruitment that a source change can be applied to, and the column each one lives in.
export const applicableFields: Record<string, { column: string; label: string }> = {
  applicationEndDate: { column: "application_end_date", label: "Last date" },
  applicationStartDate: { column: "application_start_date", label: "Start date" },
  vacancyCount: { column: "vacancy_total", label: "Vacancies" }
};

// The newest value for each field across a list of updates.
export function latestChanges(updates: SourceUpdate[]): Map<string, Change> {
  const latest = new Map<string, Change>();
  for (const update of updates) for (const change of update.changes) latest.set(change.field, change);
  return latest;
}
