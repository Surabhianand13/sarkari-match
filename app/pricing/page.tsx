import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Check } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { getExamOffer } from "@/lib/offers";
import { breadcrumbJsonLd, buildMetadata, productJsonLd } from "@/lib/seo";
import { discountPercent, formatPrice, getExam, getPublishedSeries } from "@/lib/tests/catalog";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Pricing: Exam Pass and AI Study Guide, per exam",
  description: "Simple pricing per exam. Pay once for an Exam Pass with mock tests, solutions, analysis, adaptive practice and a weekly study plan. Add the AI Study Guide for a personal AI tutor. No auto-renewal.",
  path: "/pricing"
});

const freePerks = ["Free sample test for every exam", "Exam and job notification matcher, with email alerts", "One adaptive practice session a day", "Your results and progress"];
const passPerks = ["All mock tests and sectional tests", "Detailed solution for every question", "Score, accuracy, section and topic analysis", "Unlimited adaptive practice", "Weekly 7-day study plan and progress insights"];
const guidePerks = ["An AI tutor that knows your results for this exam", "What to study today, and why", "Deeper explanations on demand", "Available with the Exam Pass for the same exam"];

export default async function PricingPage() {
  const series = await getPublishedSeries();
  const exams = new Map<string, typeof series>();
  for (const item of series) exams.set(item.examSlug, [...(exams.get(item.examSlug) ?? []), item]);
  const cards = await Promise.all(
    [...exams.entries()].map(async ([slug, items]) => {
      const exam = await getExam(slug);
      return { slug, name: items[0].examName, items, offer: exam ? await getExamOffer(exam.id) : null };
    })
  );

  return (
    <div className="bg-surface">
      <JsonLd data={[breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]), ...series.map((item) => productJsonLd({ name: item.title, description: `${item.title}: mock tests with solutions and analysis.`, path: `/tests/${item.examSlug}/${item.slug}`, pricePaise: item.pricePaise, mrpPaise: item.mrpPaise }))]} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-success">Pricing</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-primary sm:text-5xl">Simple pricing, per exam</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Pay once for the exam you are preparing. No subscriptions to cancel and no auto-renewal.{cards.length > 1 && " Preparing for more than one exam? Each extra Pass gets a discount."}</p>

        <section className="mt-10 rounded-3xl border border-border bg-white p-6 shadow-soft" aria-labelledby="free-h">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="free-h" className="text-2xl font-black text-primary">Free for everyone</h2>
              <p className="mt-1 text-sm text-muted">Create an account and start in a minute. No card needed.</p>
            </div>
            <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-black text-white">Create a free account</Link>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">{freePerks.map((perk) => <li key={perk} className="flex gap-2 text-sm font-semibold text-primary"><Check size={16} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />{perk}</li>)}</ul>
        </section>

        <div className="mt-8 grid gap-6">
          {cards.map((card) => {
            const first = card.items[0];
            const guide = card.offer?.guideEnabled && card.offer.guidePricePaise !== null ? card.offer : null;
            return (
              <section key={card.slug} className="rounded-3xl border border-border bg-white p-6 shadow-soft sm:p-8" aria-labelledby={`h-${card.slug}`}>
                <h2 id={`h-${card.slug}`} className="text-3xl font-black tracking-tight text-primary">{card.name}</h2>
                <div className={`mt-6 grid gap-5 ${guide ? "lg:grid-cols-2" : ""}`}>
                  <div className="rounded-3xl border-2 border-[rgba(24,185,67,0.35)] bg-mint/40 p-6">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-success">Exam Pass</p>
                    <p className="mt-2 flex items-end gap-3"><span className="text-4xl font-black text-primary">{formatPrice(first.pricePaise)}</span>{first.mrpPaise && first.mrpPaise > first.pricePaise && <span className="pb-1 text-lg font-bold text-muted line-through">{formatPrice(first.mrpPaise)}</span>}{discountPercent(first.pricePaise, first.mrpPaise) > 0 && <span className="mb-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-black text-success">{discountPercent(first.pricePaise, first.mrpPaise)}% off</span>}</p>
                    <p className="mt-1 text-sm font-bold text-muted">One-time · {Math.round((card.offer?.passValidityDays ?? 365) / 30)} months access · {first.testCount} tests, {first.questionCount} questions</p>
                    {card.offer && card.offer.secondExamDiscountPercent > 0 && cards.length > 1 && <p className="mt-1 text-xs font-black text-success">Already hold a Pass for another exam? Get {card.offer.secondExamDiscountPercent}% off this one.</p>}
                    <ul className="mt-4 grid gap-2">{passPerks.map((perk) => <li key={perk} className="flex gap-2 text-sm font-semibold text-primary"><Check size={16} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />{perk}</li>)}</ul>
                    <Link href={`/tests/${first.examSlug}/${first.slug}` as Route} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">See the Exam Pass <ArrowRight size={16} aria-hidden="true" /></Link>
                  </div>
                  {guide && guide.guidePricePaise !== null && (
                    <div className="rounded-3xl border border-border bg-white p-6">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-success">AI Study Guide</p>
                      <p className="mt-2 flex items-end gap-3"><span className="text-4xl font-black text-primary">{formatPrice(guide.guidePricePaise)}</span>{guide.guideMrpPaise && guide.guideMrpPaise > guide.guidePricePaise && <span className="pb-1 text-lg font-bold text-muted line-through">{formatPrice(guide.guideMrpPaise)}</span>}</p>
                      <p className="mt-1 text-sm font-bold text-muted">One-time · {Math.round(guide.guideValidityDays / 30)} months · add-on to the {card.name} Pass</p>
                      <ul className="mt-4 grid gap-2">{guidePerks.map((perk) => <li key={perk} className="flex gap-2 text-sm font-semibold text-primary"><Check size={16} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />{perk}</li>)}</ul>
                      <Link href={`/guide/${card.slug}` as Route} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-black text-primary hover:bg-surface">About the AI Study Guide</Link>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
          {!cards.length && <p className="rounded-3xl bg-white p-6 text-muted shadow-soft">Exam pricing appears here as soon as a test series is published.</p>}
        </div>
        <p className="mt-8 text-xs font-semibold text-muted">The price you see is the price you pay. See the <Link href="/refund-policy" className="underline">refund policy</Link>. More exams are on the way, each priced on its own.</p>
      </div>
    </div>
  );
}
