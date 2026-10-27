import { NextResponse } from "next/server";
import { emailAvailable } from "@/lib/email/provider";

export const dynamic = "force-dynamic";

// Which sign-in methods work right now. Sign-in by emailed code needs an email provider, so it is hidden until one is set up.
export function GET() {
  return NextResponse.json({ otp: emailAvailable() }, { headers: { "Cache-Control": "no-store" } });
}
