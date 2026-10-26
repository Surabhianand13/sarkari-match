import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { PatternTable, TrustBadges } from "@/components/tests/trust-blocks";
import { formatPrice, getExam, getPublishedSeries } from "@/lib/tests/catalog";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 300;

type Params = Promise<{ exam: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { exam: slug } = await params;
  const exam = await getExam(slug);
  if (!exam) return {};
  return buildMetadata({
    title: `${exam.name} Mock Test Series: Free Sample Test, Full Mocks and Solutions`,
    description: `${exam.name} mock tests that follow the real exam pattern, with detailed solutions and analysis. Expert-written and AI-checked. Try the free sample test.`,
    path: `/tests/${exam.slug}`
  });
}

export default async function ExamPage({ params }: { params: Params }) {
  const { exam: slug } = await params;
  const exam = await getExam(slug);
  if (!exam) notFound();
  const series = await getPublishedSeries(slug);
  const crumbs = [{ name: "Home", path: "/" }, { name: "Test series", path: "/tests" }, { name: exam.name, path: `/tests/${exam.slug}` }];
  return (
    <div className="bg-surface">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl font-black tracking-tight text-primary sm:text-5xl">{exam.name} mock test series</h1>
        {exam.description && <p className="mt-3 max-w-2xl text-lg text-muted">{exam.description}</p>}
        <TrustBadges className="mt-6" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-4">
            {series.map((item) => (
              <Link key={item.id} href={`/tests/${item.examSlug}/${item.slug}` as Route} className="rounded-3xl border border-border bg-white p-6 shadow-soft transition hover:-translate-y-0.5">
                <h2 className="text-2xl font-black text-primary">{item.title}</h2>
                <p className="mt-2 text-sm text-muted">{item.testCount} tests · {item.questionCount} questions{item.freeSampleCount ? " · free sample test" : ""}</p>
                <p className="mt-3 text-xl font-black text-primary">{formatPrice(item.pricePaise)}</p>
              </Link>
            ))}
            {!series.length && <p className="rounded-3xl bg-white p-6 text-muted shadow-soft">Tests for {exam.name} are being prepared.</p>}
          </div>
          <PatternTable examSlug={exam.slug} />
        </div>
      </section>
    </div>
  );
}
