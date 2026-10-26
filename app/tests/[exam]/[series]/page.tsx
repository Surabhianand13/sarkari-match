import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Clock, FileText, Gift } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { SeriesBuyBox } from "@/components/tests/series-buy-box";
import { ExpertsSection, PatternTable, ProcessSteps, ReviewsSection, StatsBand, TrustBadges } from "@/components/tests/trust-blocks";
import { getExamOffer } from "@/lib/offers";
import { discountPercent, formatPrice, getExam, getSeries, getSeriesTests } from "@/lib/tests/catalog";
import { testSeriesFaq } from "@/lib/faq";
import { breadcrumbJsonLd, buildMetadata, courseJsonLd, faqJsonLd, productJsonLd } from "@/lib/seo";

export const revalidate = 300;

type Params = Promise<{ exam: string; series: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { exam, series: slug } = await params;
  const series = await getSeries(exam, slug);
  if (!series) return {};
  return buildMetadata({
    title: `${series.title}: ${series.testCount} Mock Tests, Solutions and Analysis`,
    description: `${series.title}: ${series.testCount} tests and ${series.questionCount} questions that follow the real exam pattern, written by experts and AI-checked. ${series.freeSampleCount ? "Free sample test available. " : ""}${formatPrice(series.pricePaise)} one-time.`,
    path: `/tests/${series.examSlug}/${series.slug}`
  });
}

export default async function SeriesPage({ params }: { params: Params }) {
  const { exam, series: slug } = await params;
  const series = await getSeries(exam, slug);
  if (!series) notFound();
  const tests = await getSeriesTests(series.id);
  const examRow = await getExam(series.examSlug);
  const offer = examRow ? await getExamOffer(examRow.id) : null;
  const path = `/tests/${series.examSlug}/${series.slug}`;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Test series", path: "/tests" }, { name: series.examName, path: `/tests/${series.examSlug}` }, { name: series.title, path }];
  const sample = tests.find((test) => test.isFreeSample);
  const description = `${series.title}: mock tests that follow the real exam pattern, with solutions and analysis.`;

  return (
    <div className="bg-surface pb-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), productJsonLd({ name: series.title, description, path, pricePaise: series.pricePaise, mrpPaise: series.mrpPaise }), courseJsonLd({ name: series.title, description, path }), faqJsonLd(testSeriesFaq)]} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Breadcrumbs items={crumbs} />
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-success">{series.examName}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-5xl">{series.title}</h1>
            {series.description && <p className="mt-3 max-w-2xl text-lg leading-8 text-muted">{series.description}</p>}
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-black text-primary">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-soft"><FileText size={16} aria-hidden="true" /> {series.testCount} tests</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-soft"><Clock size={16} aria-hidden="true" /> {series.questionCount} questions</span>
              {sample && <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-soft"><Gift size={16} aria-hidden="true" /> Free sample test</span>}
            </div>
            <TrustBadges className="mt-6" />
          </div>
          <SeriesBuyBox
            seriesId={series.id}
            seriesSlug={series.slug}
            priceLabel={formatPrice(series.pricePaise)}
            mrpLabel={series.mrpPaise && series.mrpPaise > series.pricePaise ? formatPrice(series.mrpPaise) : null}
            discount={discountPercent(series.pricePaise, series.mrpPaise)}
            perks={["Detailed solution for every question", "Score, accuracy and section-wise analysis", "Attempt each test again whenever you like", "Works on mobile and desktop"]}
            firstTestHref={tests[0] ? `${path}/${tests[0].slug}` : null}
            validityMonths={Math.round((offer?.passValidityDays ?? 365) / 30)}
            guideLabel={offer?.guideEnabled && offer.guidePricePaise !== null ? `An AI tutor that knows your results, ${formatPrice(offer.guidePricePaise)} for ${Math.round(offer.guideValidityDays / 30)} months.` : null}
          />
        </div>

        <section className="mt-12" aria-labelledby="tests-heading">
          <h2 id="tests-heading" className="text-2xl font-black tracking-tight text-primary sm:text-3xl">Tests in this series</h2>
          <ul className="mt-5 grid gap-3">
            {tests.map((test) => (
              <li key={test.id}>
                <Link href={`${path}/${test.slug}` as Route} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5">
                  <span>
                    <span className="block font-black text-primary">{test.title}</span>
                    <span className="text-sm text-muted">{test.questionCount} questions · {test.durationMinutes} min · {test.negativeMarks} negative marks</span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${test.isFreeSample ? "bg-mint text-success" : "bg-surface text-muted"}`}>{test.isFreeSample ? "Free sample" : "In series"}</span>
                </Link>
              </li>
            ))}
            {!tests.length && <li className="rounded-2xl bg-white p-5 text-muted shadow-soft">Tests are being added to this series.</li>}
          </ul>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <PatternTable examSlug={series.examSlug} />
          <div className="grid content-start gap-4"><StatsBand /></div>
        </section>

        <section className="mt-12" aria-labelledby="process-heading">
          <h2 id="process-heading" className="mb-5 text-2xl font-black tracking-tight text-primary sm:text-3xl">How every question is made</h2>
          <ProcessSteps />
        </section>
        <div className="mt-12"><ExpertsSection /></div>
        <div className="mt-12"><ReviewsSection /></div>

        <section className="mt-12" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="mb-5 text-2xl font-black tracking-tight text-primary sm:text-3xl">Questions before you start</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {testSeriesFaq.map((item) => (
              <details key={item.question} className="rounded-2xl border border-border bg-white p-4 shadow-soft">
                <summary className="cursor-pointer font-black text-primary">{item.question}</summary>
                <p className="mt-3 text-sm leading-6 text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
