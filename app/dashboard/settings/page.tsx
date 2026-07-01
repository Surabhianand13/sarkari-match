import { requireUser } from "@/lib/auth/guards";
import { ButtonLink } from "@/components/design-system";

export const metadata = { robots: { index: false, follow: false } };

export default async function SettingsPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Settings</p>
        <h1 className="mt-2 text-3xl font-black text-primary">Notification and account settings</h1>
        <div className="mt-5 grid gap-3">
          {["Email deadline reminders", "Daily match digest", "Official-link safety prompts"].map((setting) => (
            <label key={setting} className="flex min-h-14 items-center justify-between rounded-2xl bg-surface px-4 font-bold text-primary">
              {setting}
              <input type="checkbox" defaultChecked className="size-5 accent-[#18B943]" />
            </label>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 min-[390px]:flex-row">
          <ButtonLink href="/dashboard">Back to dashboard</ButtonLink>
          <ButtonLink href="/dashboard/language" variant="secondary">Language</ButtonLink>
        </div>
      </section>
    </div>
  );
}
