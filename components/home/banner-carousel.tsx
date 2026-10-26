"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CarouselBanner = { id: string; title: string; linkUrl: string | null; version: number };

const INTERVAL_MS = 3000;

// Hero banners: 3:1 on desktop, 3:4 on mobile, advancing every 3 seconds. Hovering or focusing pauses it.
export function BannerCarousel({ banners }: { banners: CarouselBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;
  const go = (delta: number) => setIndex((current) => (current + delta + count) % count);

  return (
    <section aria-roledescription="carousel" aria-label="Featured" className="mx-auto max-w-7xl px-4 pt-4 sm:pt-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative overflow-hidden rounded-2xl bg-surface shadow-soft sm:rounded-3xl">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {banners.map((banner, position) => {
            const picture = (
              <picture>
                <source media="(min-width: 768px)" srcSet={`/api/banners/${banner.id}/desktop?v=${banner.version}`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/banners/${banner.id}/mobile?v=${banner.version}`} alt={banner.title} loading={position === 0 ? "eager" : "lazy"} className="aspect-[3/4] w-full object-cover md:aspect-[3/1]" />
              </picture>
            );
            return (
              <div key={banner.id} className="w-full shrink-0" aria-hidden={position !== index} role="group" aria-roledescription="slide" aria-label={`${position + 1} of ${count}`}>
                {banner.linkUrl ? <Link href={banner.linkUrl as Route} tabIndex={position === index ? 0 : -1}>{picture}</Link> : picture}
              </div>
            );
          })}
        </div>
        {count > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-soft md:flex" aria-label="Previous banner"><ChevronLeft size={20} aria-hidden="true" /></button>
            <button onClick={() => go(1)} className="absolute right-2 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary shadow-soft md:flex" aria-label="Next banner"><ChevronRight size={20} aria-hidden="true" /></button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {banners.map((banner, position) => (
                <button key={banner.id} onClick={() => setIndex(position)} aria-label={`Show banner ${position + 1}`} className={`h-2 rounded-full transition-all ${position === index ? "w-6 bg-white" : "w-2 bg-white/60"}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
