// Questions whose answer can go out of date. Pure helpers, safe to import anywhere.

// Topics where a correct answer today may be wrong later: events, office holders, awards, schemes, rankings.
const TIME_SENSITIVE = /current affairs|current events|awards?|appointments?|summits?|budget|schemes?|rankings?|sports events?|important days|who is|office holders?/i;

export const isTimeSensitive = (subject: string, topic: string | null | undefined) => /current/i.test(subject) || TIME_SENSITIVE.test(topic ?? "");

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const toDate = (value: string) => new Date(`${value}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

export const SOON_DAYS = 30;
export const MAX_SHELF_LIFE_MONTHS = 60;

export type Freshness = { factAsOf: string | null; validUntil: string | null; sourceTitle: string | null };

// The date a question should be re-checked: the day its facts were true, plus how long they last. Zero months means it never expires.
export function addMonths(date: string, months: number): string {
  const result = toDate(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return toIso(result);
}

// Reads the dating fields a writer returned, ignoring anything that is not a real date or a sensible number of months.
export function parseFreshness(item: { source?: unknown; as_of?: unknown; shelf_life_months?: unknown }, knownTitles: string[], today = new Date()): Freshness {
  const asOf = typeof item.as_of === "string" && DATE.test(item.as_of.trim()) ? item.as_of.trim() : null;
  const real = asOf && !Number.isNaN(toDate(asOf).getTime()) && toDate(asOf).getTime() <= today.getTime() + 24 * 3600 * 1000 && asOf >= "2000-01-01" ? asOf : null;
  const months = typeof item.shelf_life_months === "number" && Number.isInteger(item.shelf_life_months) && item.shelf_life_months >= 0 && item.shelf_life_months <= MAX_SHELF_LIFE_MONTHS ? item.shelf_life_months : 12;
  const cited = typeof item.source === "string" ? item.source.trim().toLowerCase() : "";
  const sourceTitle = knownTitles.find((title) => title.trim().toLowerCase() === cited) ?? null;
  return { factAsOf: real, validUntil: real && months > 0 ? addMonths(real, months) : null, sourceTitle };
}

export type FreshnessState = "expired" | "soon" | "fresh" | "none";

export function freshnessState(validUntil: string | null | undefined, today = new Date()): FreshnessState {
  if (!validUntil) return "none";
  const days = (toDate(validUntil.slice(0, 10)).getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / (24 * 3600 * 1000);
  return days < 0 ? "expired" : days <= SOON_DAYS ? "soon" : "fresh";
}
