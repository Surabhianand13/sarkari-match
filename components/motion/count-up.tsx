"use client";

import { useEffect, useRef, useState } from "react";

function format(value: number) {
  return value >= 100000 ? `${Math.round(value / 100000)} lakh` : value.toLocaleString("en-IN");
}

// Counts up to `value` when scrolled into view. The final text is in the markup, so it is correct without JavaScript.
export function CountUp({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 1400);
        setShown(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} aria-label={`${format(value)}${suffix} ${label}`}>
      {shown === null ? `${format(value)}${suffix}` : `${format(shown)}${suffix}`}
    </span>
  );
}
