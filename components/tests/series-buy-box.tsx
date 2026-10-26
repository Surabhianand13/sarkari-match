"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Check } from "lucide-react";

type Props = { seriesId: string; seriesSlug: string; priceLabel: string; mrpLabel?: string | null; discount: number; perks: string[]; firstTestHref?: string | null };

export function SeriesBuyBox({ seriesId, seriesSlug, priceLabel, mrpLabel, discount, perks, firstTestHref }: Props) {
  const [access, setAccess] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tests/access?series=${seriesId}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { hasAccess: boolean }) => !cancelled && setAccess(data.hasAccess))
      .catch(() => !cancelled && setAccess(false));
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  return (
    <aside className="rounded-3xl border border-border bg-white p-5 shadow-lift">
      <div className="flex items-end gap-3">
        <p className="text-4xl font-black text-primary">{priceLabel}</p>
        {mrpLabel && <p className="pb-1 text-lg font-bold text-muted line-through">{mrpLabel}</p>}
        {discount > 0 && <span className="mb-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-black text-success">{discount}% off</span>}
      </div>
      <p className="mt-1 text-xs font-bold text-muted">One-time payment. No auto-renewal.</p>
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
      <p className="mt-3 text-center text-xs font-semibold text-muted">Try the free sample test first. See the <Link href="/refund-policy" className="underline">refund policy</Link>.</p>
    </aside>
  );
}
