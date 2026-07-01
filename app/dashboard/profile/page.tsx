import { requireUser } from "@/lib/auth/guards";
import { ButtonLink, ProfileCompletionCard } from "@/components/design-system";

export const metadata = { robots: { index: false, follow: false } };

export default async function ProfilePage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ProfileCompletionCard />
      <div className="mt-5 rounded-3xl bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-black text-primary">Candidate profile</h1>
        <form action="/dashboard/matches" className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 font-bold text-primary">Highest qualification<input name="qualification" defaultValue="Graduate" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
          <label className="grid gap-2 font-bold text-primary">State preference<input name="state" defaultValue="Karnataka" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
          <label className="grid gap-2 font-bold text-primary">Category<select name="category" defaultValue="general" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold"><option value="general">General</option><option value="obc">OBC</option><option value="sc">SC</option><option value="st">ST</option><option value="ews">EWS</option></select></label>
          <label className="grid gap-2 font-bold text-primary">Date of birth<input name="dob" type="date" className="min-h-12 rounded-2xl border border-border px-3 py-2 font-semibold" /></label>
          <div className="sm:col-span-2 flex flex-col gap-3 min-[390px]:flex-row">
            <button className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 py-3 text-sm font-extrabold text-white shadow-green">Update and view matches</button>
            <ButtonLink href="/dashboard/settings" variant="secondary">Notification settings</ButtonLink>
          </div>
        </form>
      </div>
    </div>
  );
}
