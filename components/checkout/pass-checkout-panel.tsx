"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

export type PlanOption = { name: string; priceLabel: string; mrpLabel?: string | null; note: string; perks: string[]; payLabel: string; href: string | null };

// Two plans side by side: the regular Exam Pass, and the Pass with the AI Study Guide. The server builds each plan's payment link
// (each with its own signed quote); this only switches between them, so the amount can never be changed in the browser.
// The Basic plan is selected first: nothing more expensive is pre-selected for the learner.
export function PassCheckoutPanel({ basic, ai }: { basic: PlanOption; ai: PlanOption | null }) {
  const [choice, setChoice] = useState<"basic" | "ai">("basic");
  const selected = choice === "ai" && ai ? ai : basic;

  const card = (key: "basic" | "ai", plan: PlanOption) => {
    const on = choice === key;
    const isAi = key === "ai";
    return (
      <label key={key} className={`relative flex cursor-pointer flex-col rounded-3xl border-2 p-5 transition ${on ? (isAi ? "border-brand-green bg-mint/50 shadow-green" : "border-primary bg-surface") : "border-border bg-white hover:border-primary/40"}`}>
        {isAi && <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-3 py-1 text-[0.65rem] font-black uppercase tracking-wide text-white"><Sparkles size={12} aria-hidden="true" /> AI-powered</span>}
        <input type="radio" name="plan" checked={on} onChange={() => setChoice(key)} className="sr-only" />
        <span className="flex items-start justify-between gap-3">
          <span className="font-black text-primary">{plan.name}</span>
          <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-brand-green bg-brand-green text-white" : "border-border"}`}>{on && <Check size={12} aria-hidden="true" />}</span>
        </span>
        <span className="mt-2 flex items-end gap-2"><span className="text-3xl font-black text-primary">{plan.priceLabel}</span>{plan.mrpLabel && <span className="pb-1 text-sm font-bold text-muted line-through">{plan.mrpLabel}</span>}</span>
        <span className="mt-1 text-xs font-bold text-muted">{plan.note}</span>
        <ul className="mt-4 grid gap-2">
          {plan.perks.map((perk) => <li key={perk} className="flex gap-2 text-sm font-semibold text-primary"><Check size={15} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />{perk}</li>)}
        </ul>
      </label>
    );
  };

  return (
    <div>
      <div role="radiogroup" aria-label="Choose your plan" className={`mt-6 grid gap-4 ${ai ? "md:grid-cols-2" : ""}`}>
        {card("basic", basic)}
        {ai && card("ai", ai)}
      </div>
      {selected.href && <a href={selected.href} className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">{selected.payLabel}</a>}
    </div>
  );
}
