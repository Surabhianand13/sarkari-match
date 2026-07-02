"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import { localizeStaticLabel, type StaticLabelKey } from "@/lib/i18n/locales";

export function T({ k, as: As = "span" }: { k: StaticLabelKey; as?: keyof React.JSX.IntrinsicElements }) {
  const { locale } = useLocale();
  return <As>{localizeStaticLabel(k, locale)}</As>;
}
