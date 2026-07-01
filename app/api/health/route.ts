import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "sarkarimatch",
    time: new Date().toISOString()
  });
}
