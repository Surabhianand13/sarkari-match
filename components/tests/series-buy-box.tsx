"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Check } from "lucide-react";

type Props = { seriesId: string; seriesSlug: string; priceLabel: string; mrpLabel?: string | null; discount: number; perks: string[]; firstTestHref?: string | null; guideLabel?: string | null; validityMonths?: number };
type Access = { hasAccess: boolean; quote: { payablePaise: number; listPaise: number; discountPercent: number; examSlug: string } | null; guide: { enabled: boolean; pricePaise: number | null; canBuy: boolean; owned: boolean } | null };

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

export function SeriesBuyBox({ seriesId, seriesSlug, priceLabel, mrpLabel, discount, perks, firstTestHref, guideLabel, validityMonths = 12 }: Props) {
  const [info, setInfo] = useState<Access | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tests/access?series=${seriesId}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: Access) => !cancelled && setInfo(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  const access = info?.hasAccess ?? false;
  const second = info?.quote && info.quote.discountPercent > 0 ? info.quote : null;
  return (
    <aside className="rounded-3xl border border-border bg-white p-5 shadow-lift">
      <div className="flex items-end gap-3">
        <p className="text-4xl font-black text-primary">{second ? rupees(second.payablePaise) : priceLabel}</p>
        {second ? <p className="pb-1 text-lg font-bold text-muted line-through">{priceLabel}</p> : mrpLabel && <p className="pb-1 text-lg font-bold text-muted line-through">{mrpLabel}</p>}
        {second ? <span className="mb-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-black text-success">{second.discountPercent}% off for you</span> : discount > 0 && <span className="mb-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-black text-success">{discount}% off</span>}
      </div>
      <p className="mt-1 text-xs font-bold text-muted">One-time payment. {validityMonths} months access. No auto-renewal.</p>
      {second && <p className="mt-1 text-xs font-bold text-success">Second-exam discount: you already hold a Pass for another exam.</p>}
      <ul className="mt-4 grid gap-2 text-sm font-semibold text-muted">
        {perks.map((perk) => (
          <li key={perk} className="flex gap-2"><Check className="mt-0.5 shrink-0 text-brand-green" size={16} aria-hidden="true" />{perk}</li>
        ))}
      </ul>
      {access ? (
        <Link href={(firstTestHref ?? "/dashboard/tests") as Route} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">
          You have access: open your tests
        </Link>
      ) : (
        <Link href={`/checkout/test/${seriesSlug}` as Route} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">
          Buy the test series
        </Link>
      )}
      {info?.guide?.enabled && (
        <div className="mt-4 rounded-2xl bg-surface p-3 text-sm">
          <p className="font-black text-primary">AI Study Guide</p>
          {info.guide.owned ? (
            <Link href={`/guide/${info.quote?.examSlug ?? ""}` as Route} className="mt-1 inline-flex font-black text-success underline">Open your AI Study Guide</Link>
          ) : info.guide.canBuy ? (
            <Link href={`/checkout/guide/${info.quote?.examSlug ?? ""}` as Route} className="mt-1 inline-flex font-black text-success underline">Add the AI Study Guide{info.guide.pricePaise !== null ? ` for ${rupees(info.guide.pricePaise)}` : ""}</Link>
          ) : (
            <p className="mt-1 font-semibold text-muted">{guideLabel ?? "An AI tutor that knows your results."} Available with the Pass.</p>
          )}
        </div>
      )}
      <p className="mt-3 text-center text-xs font-semibold text-muted">Try the free sample test first. See the <Link href="/refund-policy" className="underline">refund policy</Link>.</p>
    </aside>
  );
}
