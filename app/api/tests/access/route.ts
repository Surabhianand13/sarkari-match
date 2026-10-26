import { NextResponse } from "next/server";
import { getOptionalUser } from "@/lib/auth/guards";
import { getGuideStatus, passQuote } from "@/lib/offers";
import { hasSeriesAccess } from "@/lib/tests/access";

export const dynamic = "force-dynamic";

// Lets the cached public series page show the right button, price and Guide offer for the current visitor.
export async function GET(request: Request) {
  const seriesId = new URL(request.url).searchParams.get("series") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(seriesId)) return NextResponse.json({ signedIn: false, hasAccess: false });
  const user = await getOptionalUser();
  const quote = await passQuote(user?.id ?? null, seriesId);
  const guide = quote ? await getGuideStatus(user?.id ?? null, quote.examId) : null;
  return NextResponse.json(
    {
      signedIn: Boolean(user),
      hasAccess: await hasSeriesAccess(user?.id ?? null, seriesId),
      quote: quote ? { listPaise: quote.listPaise, payablePaise: quote.payablePaise, discountPercent: quote.discountPercent, examSlug: quote.examSlug } : null,
      guide: guide ? { enabled: guide.enabled, pricePaise: guide.pricePaise, mrpPaise: guide.mrpPaise, canBuy: guide.canBuy, owned: guide.owned } : null
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
