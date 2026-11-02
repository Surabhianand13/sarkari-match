"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { toLang, type Lang } from "@/lib/localize";

// The language a learner reads questions in. It uses the same saved choice as the rest of the site, so the results page agrees.
export function useQuestionLanguage(): { lang: Lang; setLang: (lang: Lang) => void } {
  const { locale, setLocale } = useLocale();
  return { lang: toLang(locale), setLang: (next) => setLocale(next) };
}

export function LanguageSwitch({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  return (
    <div role="group" aria-label="Question language" className="inline-flex rounded-full border border-border bg-white p-0.5 text-xs font-black">
      {([["en", "English"], ["hi", "हिन्दी"]] as const).map(([value, label]) => (
        <button key={value} type="button" onClick={() => onChange(value)} aria-pressed={lang === value} lang={value} className={`min-h-8 rounded-full px-3 ${lang === value ? "bg-primary text-white" : "text-primary"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
