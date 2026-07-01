import { Languages } from "lucide-react";
import { SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";
import { localeLabels, supportedLocales } from "@/lib/i18n/locales";

export const metadata = { robots: { index: false, follow: false } };

export default async function LanguagePage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SectionHeading eyebrow="Language" title="Multilingual readiness" body="P2 prepares locale preferences and reviewed content localizations. English remains the default until translated content is reviewed." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {supportedLocales.map((locale) => (
          <section key={locale} className="rounded-3xl bg-white p-5 shadow-soft">
            <Languages className="text-brand-green" size={24} aria-hidden="true" />
            <h2 className="mt-3 text-xl font-black text-primary">{localeLabels[locale]}</h2>
            <p className="mt-1 text-sm font-bold text-muted">{locale === "en" ? "Default" : "Review required before public use"}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
