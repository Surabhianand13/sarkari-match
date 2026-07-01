import { BellRing, Mail } from "lucide-react";
import { SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { robots: { index: false, follow: false } };

export default async function AlertsPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SectionHeading eyebrow="Alerts" title="Email alert preferences" body="P1 adds provider interfaces and logs. Email sends remain development no-op until Resend is configured." />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Weekly digest", "Included for Free users", Mail],
          ["Daily digest", "Pro entitlement", BellRing],
          ["Closing-soon reminders", "Configurable per user", BellRing],
          ["Saved notification changes", "Never sends sensitive profile data", Mail]
        ].map(([title, body, Icon]) => (
          <section key={title as string} className="rounded-3xl bg-white p-5 shadow-soft">
            <Icon className="text-brand-green" size={24} aria-hidden="true" />
            <h2 className="mt-3 font-black text-primary">{title as string}</h2>
            <p className="mt-1 text-sm text-muted">{body as string}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
