import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/guards";
import { hasSeriesAccess } from "@/lib/tests/access";

export const dynamic = "force-dynamic";

// Lets the cached public series page show the right button for the current visitor.
export async function GET(request: Request) {
  const seriesId = new URL(request.url).searchParams.get("series") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(seriesId)) return NextResponse.json({ signedIn: false, hasAccess: false });
  const user = await getOptionalUser();
  return NextResponse.json({ signedIn: Boolean(user), hasAccess: await hasSeriesAccess(user?.id ?? null, seriesId) }, { headers: { "Cache-Control": "no-store" } });
}
