import { UsersRound } from "lucide-react";
import { ButtonLink, SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";
import { canCreateCandidateProfile, candidateProfileLimit, profileCompletenessLabel } from "@/lib/profiles/limits";

export const metadata = { robots: { index: false, follow: false } };

export default async function FamilyProfilesPage() {
  await requireUser();
  const plan = "pro_plus_monthly" as const;
  const profiles = [{ id: "self", displayName: "Primary profile", completion: 75, relationship: "self" as const }];
  const limit = candidateProfileLimit(plan);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <SectionHeading eyebrow="Pro Plus" title="Family and multi-candidate dashboard" body="Pro Plus supports up to 3 candidate profiles for families or shared preparation." />
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift">
          <UsersRound className="text-[#B9F8CD]" size={30} aria-hidden="true" />
          <h2 className="mt-4 text-3xl font-black">{profiles.length}/{limit} profiles used</h2>
          <p className="mt-3 text-white/75">Profile limits must be enforced by server entitlements, not only by this UI.</p>
          <ButtonLink href="/pricing" variant="secondary" className="mt-5 bg-white text-primary">Review Pro Plus</ButtonLink>
        </section>
        <section className="rounded-[2rem] bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black text-primary">Profiles</h2>
          <div className="mt-4 grid gap-3">
            {profiles.map((profile) => (
              <article key={profile.id} className="rounded-2xl bg-surface p-4">
                <p className="font-black text-primary">{profile.displayName}</p>
                <p className="mt-1 text-sm font-bold text-muted">{profileCompletenessLabel(profile.completion)} · {profile.completion}% complete</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm font-bold text-muted">{canCreateCandidateProfile(plan, profiles.length) ? "Another profile can be added after live persistence is connected." : "Profile limit reached."}</p>
        </section>
      </div>
    </div>
  );
}
