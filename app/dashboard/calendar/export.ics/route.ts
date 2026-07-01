import { NextResponse } from "next/server";
import { buildDeadlineEvents, toIcs } from "@/lib/calendar/events";
import { demoJobs } from "@/lib/data/catalog";

export function GET() {
  const ics = toIcs(demoJobs.flatMap(buildDeadlineEvents));
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=sarkarimatch-calendar.ics"
    }
  });
}
