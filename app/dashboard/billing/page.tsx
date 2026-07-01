import { requireUser } from "@/lib/auth/guards";
import { ButtonLink } from "@/components/design-system";

export const metadata = { robots: { index: false, follow: false } };

export default async function BillingPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-3xl bg-white p-5 shadow-soft">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Billing</p>
        <h1 className="mt-2 text-3xl font-black text-primary">Free demo workspace</h1>
        <p className="mt-3 text-muted">Your account is on the free plan in this local build. Checkout pages are ready, and live Razorpay collection can be enabled with payment keys and plan IDs.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PlanStat label="Current plan" value="Free" />
          <PlanStat label="Saved notifications" value="0 / 3" />
          <PlanStat label="Renewal" value="None" />
        </div>
        <div className="mt-6 flex flex-col gap-3 min-[390px]:flex-row">
          <ButtonLink href="/pricing">Compare plans</ButtonLink>
          <ButtonLink href="/checkout/founding" variant="secondary">Claim Founding Pass</ButtonLink>
        </div>
      </section>
    </div>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black text-primary">{value}</p>
    </div>
  );
}
