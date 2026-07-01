export const supportedLocales = ["en", "hi", "kn", "te", "ta", "mr"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const localeLabels: Record<SupportedLocale, string> = {
  en: "English",
  hi: "हिन्दी",
  kn: "ಕನ್ನಡ",
  te: "తెలుగు",
  ta: "தமிழ்",
  mr: "मराठी"
};

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export function resolveLocale(value: string | undefined | null): SupportedLocale {
  if (value && isSupportedLocale(value)) return value;
  return "en";
}

export function localizeStaticLabel(key: "find_matches" | "latest_jobs" | "profile", locale: SupportedLocale) {
  const labels: Record<typeof key, Record<SupportedLocale, string>> = {
    find_matches: { en: "Find My Matches", hi: "मेरे मैच खोजें", kn: "ನನ್ನ ಹೊಂದಾಣಿಕೆಗಳು", te: "నా మ్యాచులు", ta: "என் பொருத்தங்கள்", mr: "माझे मॅच शोधा" },
    latest_jobs: { en: "Latest Govt Job Notifications", hi: "नई सरकारी नौकरी अधिसूचनाएं", kn: "ಹೊಸ ಸರ್ಕಾರಿ ಉದ್ಯೋಗ ಅಧಿಸೂಚನೆಗಳು", te: "తాజా ప్రభుత్వ ఉద్యోగ నోటిఫికేషన్లు", ta: "புதிய அரசு வேலை அறிவிப்புகள்", mr: "नवीन सरकारी नोकरी अधिसूचना" },
    profile: { en: "Profile", hi: "प्रोफाइल", kn: "ಪ್ರೊಫೈಲ್", te: "ప్రొఫైల్", ta: "சுயவிவரம்", mr: "प्रोफाइल" }
  };
  return labels[key][locale];
}
