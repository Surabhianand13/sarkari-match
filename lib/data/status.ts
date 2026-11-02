export type ApplicationStatus = "open" | "closed" | "upcoming";

// Today's date in India, as YYYY-MM-DD. A notification stays open through its last date.
export function todayInIndia(now = Date.now()) {
  return new Date(now + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// What a notification is today, worked out from its dates so nobody has to move it to "past" by hand.
// A post an editor closed stays closed (withdrawn or cancelled), whatever its dates say.
export function effectiveStatus(stored: ApplicationStatus, dates: { startDate?: string | null; endDate?: string | null }, today = todayInIndia()): ApplicationStatus {
  const end = dates.endDate?.slice(0, 10);
  const start = dates.startDate?.slice(0, 10);
  if (stored === "closed" || (end && end < today)) return "closed";
  if ((start && start > today) || (!start && stored === "upcoming")) return "upcoming";
  return "open";
}

// Open notifications first, then upcoming, then past. The order inside each group is kept.
const statusOrder: Record<ApplicationStatus, number> = { open: 0, upcoming: 1, closed: 2 };
export function byStatus<T extends { applicationStatus: ApplicationStatus }>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => statusOrder[a.applicationStatus] - statusOrder[b.applicationStatus]);
}
