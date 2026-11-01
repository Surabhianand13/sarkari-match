// Questions about events (current affairs). Each carries the month its facts are from, shown to learners as "October 2026".
// Pure helpers, safe to import anywhere.

// Topics where the answer depends on when it was asked: events, office holders, awards, schemes, rankings.
const TIME_SENSITIVE = /current affairs|current events|awards?|appointments?|summits?|budget|schemes?|rankings?|sports events?|important days|who is|office holders?/i;

export const isTimeSensitive = (subject: string, topic: string | null | undefined) => /current/i.test(subject) || TIME_SENSITIVE.test(topic ?? "");

const MONTH = /^(\d{4})-(\d{2})(?:-\d{2})?$/;

export type FactMonth = { factAsOf: string | null; sourceTitle: string | null };

// Reads the dating a writer returned: a month (YYYY-MM or a full date) that is not in the future, and a source that is a note we have.
export function parseFactMonth(item: { source?: unknown; as_of?: unknown }, knownTitles: string[], today = new Date()): FactMonth {
  const match = typeof item.as_of === "string" ? MONTH.exec(item.as_of.trim()) : null;
  const year = match ? Number(match[1]) : 0;
  const month = match ? Number(match[2]) : 0;
  const thisMonth = today.getUTCFullYear() * 12 + today.getUTCMonth();
  const valid = match && month >= 1 && month <= 12 && year >= 2000 && year * 12 + (month - 1) <= thisMonth + 1;
  const cited = typeof item.source === "string" ? item.source.trim().toLowerCase() : "";
  return { factAsOf: valid ? `${match![1]}-${match![2]}-01` : null, sourceTitle: knownTitles.find((title) => title.trim().toLowerCase() === cited) ?? null };
}

const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];

// "October 2026" (or "अक्टूबर 2026") from a stored date such as 2026-10-01. Null when there is no date.
export function monthYearLabel(value: string | null | undefined, lang: "en" | "hi" = "en"): string | null {
  const match = value ? MONTH.exec(value.slice(0, 10)) : null;
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${(lang === "hi" ? MONTHS_HI : MONTHS_EN)[month - 1]} ${match[1]}`;
}
