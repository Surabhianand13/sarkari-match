import { CreditCard, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/design-system";

export function CheckoutStatusPage({ title, price, plan }: { title: string; price: string; plan: string }) {
  const paymentsEnabled = process.env.NEXT_PUBLIC_ENABLE_PAYMENTS === "true";
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <section className="rounded-[2rem] bg-white p-6 shadow-lift">
        <CreditCard className="text-brand-green" size={32} aria-hidden="true" />
        <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-success">Checkout</p>
        <h1 className="mt-2 text-3xl font-black text-primary">{title}</h1>
        <p className="mt-3 text-2xl font-black text-foreground">{price}</p>
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
