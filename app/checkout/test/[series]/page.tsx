import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getOptionalUser } from "@/lib/auth/guards";
import { passQuote } from "@/lib/offers";
import { hasSeriesAccess } from "@/lib/tests/access";
import { discountPercent, formatPrice, getSeriesBySlug } from "@/lib/tests/catalog";
import { signCheckoutRef } from "@/lib/tests/checkout-ref";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TestCheckoutPage({ params }: { params: Promise<{ series: string }> }) {
  const { series: slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();
  const path = `/checkout/test/${series.slug}`;
  const user = await getOptionalUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(path)}` as Route);
  if (await hasSeriesAccess(user.id, series.id, series.pricePaise)) redirect(`/tests/${series.examSlug}/${series.slug}` as Route);

  // What this learner pays: the list price, or the second-exam discount when they already hold a Pass for another exam.
  const quote = await passQuote(user.id, series.id);
  const payable = quote?.payablePaise ?? series.pricePaise;

  // The payment page receives a signed, short-lived reference (with the quoted amount) instead of the learner's personal details.
  const checkoutUrl = process.env.TEST_CHECKOUT_URL;
  let payHref: string | null = null;
  if (checkoutUrl) {
    const url = new URL(checkoutUrl);
    url.searchParams.set("product", "pass");
    url.searchParams.set("series", series.slug);
    url.searchParams.set("amount", String(payable));
    url.searchParams.set("ref", await signCheckoutRef({ userId: user.id, product: "pass", targetId: series.id, amountPaise: payable }));
    payHref = url.toString();
  }
  const discount = discountPercent(series.pricePaise, series.mrpPaise);
  const validity = quote ? Math.round(quote.validityDays / 30) : 12;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <section className="rounded-[2rem] bg-white p-6 shadow-lift">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Checkout · Exam Pass</p>
        <h1 className="mt-2 text-2xl font-black text-primary">{series.title}</h1>
        <p className="mt-1 text-sm text-muted">{series.testCount} tests · {series.questionCount} questions · solutions and analysis · {validity} months access</p>
        <div className="mt-5 flex items-end gap-3">
          <p className="text-4xl font-black text-primary">{formatPrice(payable)}</p>
          {payable < series.pricePaise ? <p className="pb-1 text-lg font-bold text-muted line-through">{formatPrice(series.pricePaise)}</p> : series.mrpPaise && series.mrpPaise > series.pricePaise && <p className="pb-1 text-lg font-bold text-muted line-through">{formatPrice(series.mrpPaise)}</p>}
          {quote?.discountPercent ? <span className="mb-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-black text-success">{quote.discountPercent}% off your second exam</span> : discount > 0 && <span className="mb-1.5 rounded-full bg-mint px-2.5 py-1 text-xs font-black text-success">{discount}% off</span>}
        </div>
        <p className="mt-1 text-xs font-bold text-muted">One-time payment. No auto-renewal. Signed in as {user.email}.</p>
        {payHref ? (
          <a href={payHref} className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">Pay {formatPrice(payable)} securely</a>
        ) : (
          <p className="mt-6 rounded-2xl bg-amber-soft p-4 text-sm font-bold text-warning">Online payment is opening soon. Try the free sample test meanwhile, or <Link href="/contact" className="underline">contact us</Link> to buy now.</p>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs font-semibold text-muted"><ShieldCheck className="mt-0.5 shrink-0 text-teal" size={14} aria-hidden="true" />Access is added to your account automatically after payment. Read the <Link href="/refund-policy" className="underline">refund policy</Link>.</p>
      </section>
    </div>
  );
}
