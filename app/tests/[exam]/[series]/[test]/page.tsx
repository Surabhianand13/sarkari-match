import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, ListChecks, MinusCircle } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { StartTestButton } from "@/components/tests/start-test-button";
import { getSeries, getTest } from "@/lib/tests/catalog";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Params = Promise<{ exam: string; series: string; test: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { exam, series: seriesSlug, test: testSlug } = await params;
  const series = await getSeries(exam, seriesSlug);
  const test = series ? await getTest(series.id, testSlug) : null;
  if (!series || !test) return {};
  return buildMetadata({
    title: `${test.title}: ${series.title}`,
    description: `${test.title}: ${test.questionCount} questions in ${test.durationMinutes} minutes with ${test.negativeMarks} negative marking. Full solutions and analysis after you submit.`,
    path: `/tests/${series.examSlug}/${series.slug}/${test.slug}`
  });
}

export default async function TestIntroPage({ params }: { params: Params }) {
  const { exam, series: seriesSlug, test: testSlug } = await params;
  const series = await getSeries(exam, seriesSlug);
  const test = series ? await getTest(series.id, testSlug) : null;
  if (!series || !test) notFound();
  const path = `/tests/${series.examSlug}/${series.slug}/${test.slug}`;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Test series", path: "/tests" }, { name: series.title, path: `/tests/${series.examSlug}/${series.slug}` }, { name: test.title, path }];

  return (
    <div className="bg-surface">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <Breadcrumbs items={crumbs} />
        <p className="text-xs font-black uppercase tracking-[0.16em] text-success">{series.title}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-4xl">{test.title}</h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[[ListChecks, `${test.questionCount} questions`], [Clock, `${test.durationMinutes} minutes`], [MinusCircle, `${test.negativeMarks} negative marks per wrong answer`]].map(([Icon, label]) => {
            const I = Icon as typeof Clock;
            return <div key={label as string} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-primary shadow-soft"><I size={18} className="text-brand-green" aria-hidden="true" />{label as string}</div>;
          })}
        </div>
        {test.sections.length > 0 && (
          <div className="mt-6 rounded-3xl bg-white p-5 shadow-soft">
            <h2 className="font-black text-primary">Sections</h2>
            <ul className="mt-2 grid gap-1 text-sm text-muted">{test.sections.map((section) => <li key={section.name}>{section.name}: {section.questions} questions</li>)}</ul>
          </div>
        )}
        <div className="mt-6 rounded-3xl bg-white p-5 shadow-soft">
          <h2 className="font-black text-primary">Instructions</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
            <li>The timer starts when you press Start and does not stop. When time ends, the test is submitted automatically.</li>
            <li>Each correct answer earns {test.defaultMarks} marks. Each wrong answer loses {test.negativeMarks}. Unanswered questions lose nothing.</li>
            <li>Your answers are saved as you go. If your connection drops, reopen the test from your dashboard to continue.</li>
            <li>Solutions and analysis appear after you submit.</li>
          </ul>
          {test.instructions && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{test.instructions}</p>}
        </div>
        <div className="mt-8">
          <StartTestButton testId={test.id} returnPath={path} checkoutPath={`/checkout/test/${series.slug}`} label={test.isFreeSample ? "Start the free sample test" : "Start test"} />
          {!test.isFreeSample && <p className="mt-2 text-xs font-semibold text-muted">This test is part of the paid series. You will be asked to buy it if you do not have access yet.</p>}
        </div>
      </section>
    </div>
  );
}
