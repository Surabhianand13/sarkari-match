import { Gift, Share2 } from "lucide-react";
import { ButtonLink, SectionHeading } from "@/components/design-system";
import { requireUser } from "@/lib/auth/guards";
import { createReferralCode, rewardsForPaidReferralCount } from "@/lib/referrals/rules";

export const metadata = { robots: { index: false, follow: false } };

export default async function ReferralsPage() {
  const user = await requireUser();
  const code = createReferralCode(user.id);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <SectionHeading eyebrow="Referrals" title="Share SarkariMatch with other aspirants" body="Referral rewards are granted only after verified signups or successful payments, with fraud controls." />
      <section className="rounded-[2rem] bg-[linear-gradient(135deg,#0B2D63,#0D9488)] p-6 text-white shadow-lift">
        <Share2 className="text-[#B9F8CD]" size={28} aria-hidden="true" />
        <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#B9F8CD]">Your referral code</p>
        <h2 className="mt-2 text-4xl font-black tracking-widest">{code}</h2>
        <p className="mt-3 text-white/75">Referral links will use this code once live attribution is connected.</p>
      </section>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {rewardsForPaidReferralCount(10).map((reward) => (
          <div key={reward} className="rounded-3xl bg-white p-5 shadow-soft">
            <Gift className="text-brand-green" size={22} aria-hidden="true" />
            <p className="mt-3 text-sm font-black capitalize text-primary">{reward.replaceAll("_", " ")}</p>
          </div>
        ))}
      </div>
      <ButtonLink href="/pricing" className="mt-5">View Pro rewards</ButtonLink>
    </div>
  );
}
