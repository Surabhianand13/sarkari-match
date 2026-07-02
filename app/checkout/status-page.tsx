import { CreditCard, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/design-system";
import { T } from "@/components/i18n/t";
import type { StaticLabelKey } from "@/lib/i18n/locales";

export function CheckoutStatusPage({ title, price, plan, priceNote, showNoAutoDebitBadge }: { title: string; price: string; plan: string; priceNote?: StaticLabelKey; showNoAutoDebitBadge?: boolean }) {
  const paymentsEnabled = process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === "true";
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <section className="rounded-[2rem] bg-white p-6 shadow-lift">
        <CreditCard className="text-brand-green" size={32} aria-hidden="true" />
        <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-success">Checkout</p>
        <h1 className="mt-2 text-3xl font-black text-primary">{title}</h1>
        <p className="mt-3 text-2xl font-black text-foreground">{price}</p>
        {priceNote && <p className="mt-1 text-xs font-bold text-muted"><T k={priceNote} /></p>}
        {showNoAutoDebitBadge && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[0.68rem] font-black text-success">
            <ShieldCheck size={12} aria-hidden="true" /> <T k="badge_no_autodebit" />
          </span>
        )}
        <p className="mt-2 text-muted">{plan}</p>
        <div className="mt-5 rounded-2xl bg-mint p-4 text-sm font-bold text-success">
          <ShieldCheck className="mb-2" size={18} aria-hidden="true" />
          {paymentsEnabled ? "Payments are enabled. Connect the Razorpay order/subscription creation action to launch Checkout." : "Payments are currently disabled. Set NEXT_PUBLIC_ENABLE_PAYMENTS=true and configure Razorpay keys before collecting money."}
        </div>
        <div className="mt-6 flex flex-col gap-3 min-[390px]:flex-row">
          <ButtonLink href="/pricing">Back to pricing</ButtonLink>
          <ButtonLink href="/dashboard/billing" variant="secondary">View billing</ButtonLink>
        </div>
      </section>
    </div>
  );
}
