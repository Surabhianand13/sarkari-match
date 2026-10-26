import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getOptionalUser } from "@/lib/auth/guards";
import { PassCheckoutPanel } from "@/components/checkout/pass-checkout-panel";
import { getExamOffer, hasGuideAccess, passQuote } from "@/lib/offers";
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
  const link = async (product: "pass" | "bundle", amount: number) => {
    if (!checkoutUrl) return null;
    const url = new URL(checkoutUrl);
    url.searchParams.set("product", product);
    url.searchParams.set("series", series.slug);
    url.searchParams.set("amount", String(amount));
    url.searchParams.set("ref", await signCheckoutRef({ userId: user.id, product, targetId: series.id, amountPaise: amount }));
    return url.toString();
  };
  const payHref = await link("pass", payable);

  // The AI plan is the Pass plus the AI Study Guide for the same exam, paid in one payment.
  const offer = quote ? await getExamOffer(quote.examId) : null;
  const guideOn = Boolean(offer?.guideEnabled && offer.guidePricePaise !== null && quote && !(await hasGuideAccess(user.id, quote.examId)));
  const guidePrice = guideOn ? (offer!.guidePricePaise as number) : 0;
  const months = Math.round((quote?.validityDays ?? 365) / 30);
  const basicPerks = ["All mock tests and sectional tests", "Detailed solution for every question", "Score, accuracy, section and topic analysis", "Unlimited adaptive practice", "Weekly 7-day study plan and progress"];
  const basic = {
    name: "Basic Pass", priceLabel: formatPrice(payable), mrpLabel: payable < series.pricePaise ? formatPrice(series.pricePaise) : series.mrpPaise && series.mrpPaise > series.pricePaise ? formatPrice(series.mrpPaise) : null,
    note: `One-time · ${months} months access`, perks: basicPerks, payLabel: `Pay ${formatPrice(payable)} securely`, href: payHref
  };
  const ai = guideOn && offer
    ? {
        name: "AI Pass", priceLabel: formatPrice(payable + guidePrice), mrpLabel: null,
        note: `One-time · ${months} months · Pass ${formatPrice(payable)} + AI Study Guide ${formatPrice(guidePrice)}`,
        perks: ["Everything in the Basic Pass", "AI tutor that knows your results for this exam", "What to study today, and why", "Deeper explanations on demand"],
        payLabel: `Pay ${formatPrice(payable + guidePrice)} securely`, href: await link("bundle", payable + guidePrice)
      }
    : null;
  const discount = discountPercent(series.pricePaise, series.mrpPaise);

  return (
    <div className={`mx-auto px-4 py-10 ${ai ? "max-w-3xl" : "max-w-xl"}`}>
      <section className="rounded-[2rem] bg-white p-6 shadow-lift sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Checkout · {series.examName}</p>
        <h1 className="mt-2 text-2xl font-black text-primary">{series.title}</h1>
        <p className="mt-1 text-sm text-muted">{series.testCount} tests · {series.questionCount} questions · solutions and analysis</p>
        {quote?.discountPercent ? <p className="mt-3 inline-flex rounded-full bg-mint px-3 py-1 text-xs font-black text-success">{quote.discountPercent}% off your second exam is applied to the Pass</p> : discount > 0 && !ai && <p className="mt-3 inline-flex rounded-full bg-mint px-3 py-1 text-xs font-black text-success">{discount}% off</p>}
        {payHref ? (
          <PassCheckoutPanel basic={basic} ai={ai} />
        ) : (
          <p className="mt-6 rounded-2xl bg-amber-soft p-4 text-sm font-bold text-warning">Online payment is opening soon. Try the free sample test meanwhile, or <Link href="/contact" className="underline">contact us</Link> to buy now.</p>
        )}
        <p className="mt-4 text-xs font-bold text-muted">One-time payment. No auto-renewal. Signed in as {user.email}.</p>
        <p className="mt-2 flex items-start gap-2 text-xs font-semibold text-muted"><ShieldCheck className="mt-0.5 shrink-0 text-teal" size={14} aria-hidden="true" />Access is added to your account automatically after payment. Read the <Link href="/refund-policy" className="underline">refund policy</Link>.</p>
      </section>
    </div>
  );
}
