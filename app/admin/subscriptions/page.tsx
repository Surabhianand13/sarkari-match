import { requireAdmin } from "@/lib/auth/guards";
import { subscriptionPlanCodes } from "@/lib/payments/subscriptions";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminSubscriptionsPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Admin</p>
      <h1 className="mt-2 text-3xl font-black text-primary">Subscriptions</h1>
      <p className="mt-3 text-muted">Regular Pro subscriptions use Razorpay Subscriptions and webhook-backed entitlements.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {subscriptionPlanCodes.map((code) => (
          <section key={code} className="rounded-3xl bg-white p-5 shadow-soft">
            <h2 className="font-black text-primary">{code}</h2>
            <p className="mt-1 text-sm text-muted">Configure Razorpay plan IDs through environment variables before enabling checkout.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
