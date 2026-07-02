"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { resolveLocale, type SupportedLocale } from "@/lib/i18n/locales";

const LOCALE_COOKIE = "sarkari_locale";

type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {}
});

function readCookieLocale(): SupportedLocale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )sarkari_locale=([^;]*)/);
  return resolveLocale(match ? decodeURIComponent(match[1]) : undefined);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");

  useEffect(() => {
    setLocaleState(readCookieLocale());
  }, []);

  function setLocale(next: SupportedLocale) {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
  }

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
