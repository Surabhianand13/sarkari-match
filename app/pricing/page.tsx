import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PricingCard, SectionHeading } from "@/components/design-system";
import { T } from "@/components/i18n/t";

type PricingSearchParams = Promise<{ billing?: string }>;

export default async function PricingPage({ searchParams }: { searchParams?: PricingSearchParams }) {
  const params = await searchParams;
  const billing = params?.billing === "annual" ? "annual" : "monthly";
  const proPlusEnabled = process.env.NEXT_PUBLIC_ENABLE_PRO_PLUS === "true";
  const whatsappEnabled = process.env.NEXT_PUBLIC_ENABLE_WHATSAPP === "true";
  const annual = billing === "annual";
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <SectionHeading eyebrow="Pricing" title="Simple plans for serious notification matching" body="No hidden charges. Founding Pass is a one-time ₹49 offer for 3 months of Pro access with no automatic renewal." align="center" />
        <div className="mx-auto mb-6 flex w-fit rounded-full bg-white p-1 shadow-soft">
          <Link href="/pricing" className={`rounded-full px-4 py-2 text-sm font-black ${!annual ? "bg-primary text-white" : "text-muted hover:text-primary"}`}>Monthly</Link>
          <Link href="/pricing?billing=annual" className={`rounded-full px-4 py-2 text-sm font-black ${annual ? "bg-primary text-white" : "text-muted hover:text-primary"}`}>Annual</Link>
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          <PricingCard title={<T k="plan_free" />} price="₹0" body="For browsing notifications and basic matching." features={["One candidate profile", "Basic eligibility status", "Save up to 3 notifications"]} actionHref="/signup" actionLabel={<T k="cta_start_free" />} />
          <PricingCard
            title={<T k="plan_founding" />}
            price="₹49 once"
            priceNote={<T k="price_anchor" />}
            trustBadge={<><ShieldCheck size={12} aria-hidden="true" /> <T k="badge_no_autodebit" /></>}
            body="Get 3 months of SarkariMatch Pro for ₹49. Limited founding offer."
            features={["No automatic renewal", "Full match explanations", "Unlimited saved notifications"]}
            featured
            actionHref="/checkout/founding"
            actionLabel={<T k="cta_claim_founding" />}
          />
          <PricingCard title={<T k="plan_pro" />} price={annual ? "₹999/yr" : "₹99/mo"} body="For active aspirants who want reminders and complete explanations." features={[annual ? "Annual billing" : "₹999 annually", "Daily digest", "Ad-free logged-in experience"]} actionHref={annual ? "/checkout/pro-annual" : "/checkout/pro-monthly"} actionLabel={<T k="cta_choose_pro" />} />
          <PricingCard title={<T k="plan_pro_plus" />} price={proPlusEnabled ? (annual ? "₹1,999/yr" : "₹199/mo") : "Coming soon"} body="Advanced alerts and multi-candidate support when enabled." features={[annual ? "Annual billing" : "₹1,999 annually", "Up to 3 profiles", whatsappEnabled ? "WhatsApp alerts enabled" : "WhatsApp when configured"]} actionHref={proPlusEnabled ? (annual ? "/checkout/pro-plus-annual" : "/checkout/pro-plus-monthly") : "/dashboard/family"} actionLabel={proPlusEnabled ? "Choose Pro Plus" : "Preview Pro Plus"} />
        </div>
      </div>
    </div>
  );
}
