import { NextResponse } from "next/server";
import { buildDeadlineEvents, toIcs } from "@/lib/calendar/events";
import { getJobs } from "@/lib/data/jobs";

export async function GET() {
  const jobs = await getJobs();
  const ics = toIcs(jobs.flatMap(buildDeadlineEvents));
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=sarkarimatch-calendar.ics"
    }
  });
}
