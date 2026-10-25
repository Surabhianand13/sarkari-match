import { NextResponse } from "next/server";
import { publicUser } from "@/lib/auth/http";
import { getOptionalUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getOptionalUser();
  return NextResponse.json({ user: user ? publicUser(user) : null }, { headers: { "Cache-Control": "no-store" } });
}
