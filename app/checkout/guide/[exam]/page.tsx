import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getOptionalUser } from "@/lib/auth/guards";
import { getGuideStatus } from "@/lib/offers";
import { formatPrice, getExam, getPublishedSeries } from "@/lib/tests/catalog";
import { signCheckoutRef } from "@/lib/tests/checkout-ref";

export const metadata = { title: "Checkout: AI Study Guide", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GuideCheckoutPage({ params }: { params: Promise<{ exam: string }> }) {
  const { exam: examSlug } = await params;
  const exam = await getExam(examSlug);
  if (!exam) notFound();
  const path = `/checkout/guide/${exam.slug}`;
  const user = await getOptionalUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(path)}` as Route);
  const status = await getGuideStatus(user.id, exam.id);
  if (!status.enabled || status.pricePaise === null) notFound();
  if (status.owned) redirect(`/guide/${exam.slug}` as Route);

  // The Guide is only sold with a Pass for the same exam.
  if (!status.hasPass) {
    const series = (await getPublishedSeries(exam.slug))[0];
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <section className="rounded-[2rem] bg-white p-6 shadow-lift">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-success">AI Study Guide · {exam.name}</p>
          <h1 className="mt-2 text-2xl font-black text-primary">Get the {exam.name} Exam Pass first</h1>
          <p className="mt-2 text-sm text-muted">The AI Study Guide works from your test results, so it is available to learners who hold the Exam Pass for {exam.name}.</p>
          <Link href={(series ? `/tests/${series.examSlug}/${series.slug}` : "/tests") as Route} className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">See the Exam Pass</Link>
        </section>
      </div>
    );
  }

  const price = status.pricePaise;
  const checkoutUrl = process.env.TEST_CHECKOUT_URL;
  let payHref: string | null = null;
  if (checkoutUrl) {
    const url = new URL(checkoutUrl);
    url.searchParams.set("product", "guide");
    url.searchParams.set("exam", exam.slug);
    url.searchParams.set("amount", String(price));
    url.searchParams.set("ref", await signCheckoutRef({ userId: user.id, product: "guide", targetId: exam.id, amountPaise: price }));
    payHref = url.toString();
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <section className="rounded-[2rem] bg-white p-6 shadow-lift">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Checkout · AI Study Guide</p>
        <h1 className="mt-2 text-2xl font-black text-primary">AI Study Guide for {exam.name}</h1>
        <p className="mt-1 text-sm text-muted">An AI tutor that knows your results, a personalised plan and deeper explanations. {Math.round(status.validityDays / 30)} months access.</p>
        <div className="mt-5 flex items-end gap-3">
          <p className="text-4xl font-black text-primary">{formatPrice(price)}</p>
          {status.mrpPaise && status.mrpPaise > price && <p className="pb-1 text-lg font-bold text-muted line-through">{formatPrice(status.mrpPaise)}</p>}
        </div>
        <p className="mt-1 text-xs font-bold text-muted">One-time payment for the year. No auto-renewal. Signed in as {user.email}.</p>
        {payHref ? (
          <a href={payHref} className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">Pay {formatPrice(price)} securely</a>
        ) : (
          <p className="mt-6 rounded-2xl bg-amber-soft p-4 text-sm font-bold text-warning">Online payment is opening soon. <Link href="/contact" className="underline">Contact us</Link> to buy now.</p>
        )}
        <p className="mt-4 flex items-start gap-2 text-xs font-semibold text-muted"><ShieldCheck className="mt-0.5 shrink-0 text-teal" size={14} aria-hidden="true" />Access is added to your account automatically after payment. Read the <Link href="/refund-policy" className="underline">refund policy</Link>.</p>
      </section>
    </div>
  );
}
