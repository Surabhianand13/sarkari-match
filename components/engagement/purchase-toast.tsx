"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

type Purchase = { name: string; state: string | null; series: string; at: string };

const hiddenPrefixes = ["/admin", "/login", "/signup", "/checkout", "/tests/attempt"];

function timeAgo(iso: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Shows genuine recent purchases from /api/social-proof, a few times per visit. Shows nothing when there are none.
export function PurchaseToast() {
  const pathname = usePathname();
  const [items, setItems] = useState<Purchase[]>([]);
  const [current, setCurrent] = useState<Purchase | null>(null);
  const hidden = hiddenPrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    fetch("/api/social-proof")
      .then((response) => response.json())
      .then((data: { items: Purchase[] }) => setItems(data.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hidden || !items.length) return;
    let shown = 0;
    let hideTimer: ReturnType<typeof setTimeout>;
    const showNext = () => {
      if (shown >= 3) return;
      setCurrent(items[shown % items.length]);
      shown += 1;
      hideTimer = setTimeout(() => setCurrent(null), 6000);
    };
    const first = setTimeout(showNext, 15000);
    const repeat = setInterval(showNext, 45000);
    return () => {
      clearTimeout(first);
      clearTimeout(hideTimer);
      clearInterval(repeat);
      setCurrent(null);
    };
  }, [items, hidden]);

  if (!current || hidden) return null;
  return (
    <div role="status" className="fixed bottom-24 left-4 z-40 flex max-w-[19rem] items-start gap-3 rounded-2xl border border-border bg-white p-3 pr-2 shadow-lift md:bottom-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-black text-success">{current.name.charAt(0).toUpperCase()}</span>
      <div className="min-w-0 text-sm">
        <p className="font-black text-primary">{current.name}{current.state ? ` from ${current.state}` : ""}</p>
        <p className="text-xs font-semibold text-muted">enrolled in {current.series}</p>
        <p className="mt-0.5 text-[0.7rem] font-bold text-success">{timeAgo(current.at)}</p>
      </div>
      <button onClick={() => setCurrent(null)} className="rounded-full p-1 text-muted hover:bg-surface" aria-label="Dismiss"><X size={14} aria-hidden="true" /></button>
    </div>
  );
}
