import { BarChart3, BookOpenCheck, CalendarCheck, ClipboardCheck, Gauge, Layers, Sparkles, Target } from "lucide-react";

const items = [
  [ClipboardCheck, "Full-length SSC CGL mocks"],
  [Gauge, "Adaptive practice"],
  [CalendarCheck, "Personalised 7-day study plan"],
  [BarChart3, "Section and topic analysis"],
  [BookOpenCheck, "Solution for every question"],
  [Target, "Free sample test"],
  [Layers, "Govt job notifications matched to you"],
  [Sparkles, "Written by experts, checked by AI"]
] as const;

// Slow, continuous strip of what the platform offers. Content is duplicated so the loop has no gap; the copy is hidden from screen readers.
export function Marquee() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {items.map(([Icon, label]) => (
        <li key={label} className="flex items-center gap-2.5 whitespace-nowrap text-sm font-black text-primary">
          <Icon size={18} className="text-brand-green" aria-hidden="true" /> {label}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee-pause overflow-hidden border-y border-border bg-white py-4" aria-label="What you get">
      <div className="animate-marquee flex w-max">{row(false)}{row(true)}</div>
    </div>
  );
}
