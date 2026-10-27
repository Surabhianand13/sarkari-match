import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { Clock, FileText, Gift } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { SeriesBuyBox } from "@/components/tests/series-buy-box";
import { TestRow } from "@/components/tests/test-row";
import { groupHref, groupLabel } from "@/lib/tests/labels";
import { ExpertsSection, PatternTable, ProcessSteps, ReviewsSection, StatsBand, TrustBadges } from "@/components/tests/trust-blocks";
import { getExamOffer } from "@/lib/offers";
import { discountPercent, formatPrice, getExam, getSeries, getSeriesGroups, listSeriesTests } from "@/lib/tests/catalog";
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
  const groups = await getSeriesGroups(series.id);
  const groupTests = await Promise.all(groups.map((group) => listSeriesTests(series.id, { kind: group.kind, level: group.level ?? "all", limit: 4 })));
  const firstTest = groupTests.flatMap((group) => group.tests).find((test) => test.isFreeSample) ?? groupTests[0]?.tests[0] ?? null;
  const hasSample = groups.some((group) => group.freeSamples > 0);
  const examRow = await getExam(series.examSlug);
  const offer = examRow ? await getExamOffer(examRow.id) : null;
  const path = `/tests/${series.examSlug}/${series.slug}`;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Test series", path: "/tests" }, { name: series.examName, path: `/tests/${series.examSlug}` }, { name: series.title, path }];
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
              {hasSample && <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-soft"><Gift size={16} aria-hidden="true" /> Free sample test</span>}
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
            firstTestHref={firstTest ? `${path}/${firstTest.slug}` : null}
            validityMonths={Math.round((offer?.passValidityDays ?? 365) / 30)}
            guideLabel={offer?.guideEnabled && offer.guidePricePaise !== null ? `An AI tutor that knows your results, ${formatPrice(offer.guidePricePaise)} for ${Math.round(offer.guideValidityDays / 30)} months.` : null}
          />
        </div>

        <section className="mt-12" aria-labelledby="tests-heading">
          <h2 id="tests-heading" className="text-2xl font-black tracking-tight text-primary sm:text-3xl">What is in this series</h2>
          <div className="mt-5 grid gap-8">
            {groups.map((group, index) => (
              <div key={`${group.kind}-${group.level}`}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h3 className="text-xl font-black text-primary">{groupLabel(group)} <span className="text-base font-bold text-muted">({group.count})</span></h3>
                  {group.count > groupTests[index].tests.length && <Link href={groupHref(path, group) as Route} className="text-sm font-black text-primary underline">Browse all {group.count}</Link>}
                </div>
                <ul className="mt-3 grid gap-3">
                  {groupTests[index].tests.map((test) => <li key={test.id}><TestRow test={test} basePath={path} /></li>)}
                </ul>
              </div>
            ))}
            {!groups.length && <p className="rounded-2xl bg-white p-5 text-muted shadow-soft">Tests are being added to this series.</p>}
          </div>
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
