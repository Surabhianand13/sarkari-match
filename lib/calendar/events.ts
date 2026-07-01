import { formatISO, parseISO, subDays } from "date-fns";
import type { JobPost } from "@/lib/data/catalog";

export type CalendarEvent = {
  uid: string;
  title: string;
  startsAt: string;
  description: string;
  url?: string;
};

export function buildDeadlineEvents(job: JobPost): CalendarEvent[] {
  const lastDate = parseISO(job.applicationEndDate);
  return [
    {
      uid: `${job.id}-deadline`,
      title: `${job.title} application deadline`,
      startsAt: formatISO(lastDate, { representation: "date" }),
      description: `Last date to apply for ${job.title}. Verify the official notification before applying.`,
      url: job.officialApplicationUrl
    },
    {
      uid: `${job.id}-reminder`,
      title: `Reminder: ${job.title} closes soon`,
      startsAt: formatISO(subDays(lastDate, 3), { representation: "date" }),
      description: `SarkariMatch reminder to review eligibility and official links for ${job.title}.`,
      url: job.officialApplicationUrl
    }
  ];
}

export function toIcs(events: CalendarEvent[]) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SarkariMatch//Exam Calendar//EN"];
  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcs(event.uid)}@sarkarimatch.com`);
    lines.push(`DTSTART;VALUE=DATE:${event.startsAt.replaceAll("-", "")}`);
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
    if (event.url) lines.push(`URL:${escapeIcs(event.url)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function escapeIcs(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,").replaceAll(";", "\\;").replaceAll("\n", "\\n");
}
