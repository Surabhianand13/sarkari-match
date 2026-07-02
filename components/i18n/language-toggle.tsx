"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="inline-flex items-center rounded-full border border-[color:var(--border)] bg-white p-0.5 text-xs font-black" role="group" aria-label="Choose language">
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-full px-2.5 py-1.5 transition ${locale === "en" ? "bg-primary text-white" : "text-muted"}`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("hi")}
        className={`rounded-full px-2.5 py-1.5 transition ${locale === "hi" ? "bg-primary text-white" : "text-muted"}`}
        aria-pressed={locale === "hi"}
      >
        हिं
      </button>
    </div>
  );
}
