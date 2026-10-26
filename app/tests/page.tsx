import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { TrustBadges } from "@/components/tests/trust-blocks";
import { getPublishedSeries, formatPrice } from "@/lib/tests/catalog";
import { breadcrumbJsonLd, buildMetadata, itemListJsonLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Mock Test Series for Govt Exams: SSC CGL and More",
  description: "Affordable full-length mock tests and sectional tests for SSC CGL and other govt exams. Expert-written, AI-checked, with solutions and analysis. Try a free sample test.",
  path: "/tests"
});

export default async function TestsHubPage() {
  const series = await getPublishedSeries();
  const crumbs = [{ name: "Home", path: "/" }, { name: "Test series", path: "/tests" }];
  return (
    <div className="bg-surface">
      <JsonLd data={[breadcrumbJsonLd(crumbs), itemListJsonLd("Mock test series", series.map((item) => ({ name: item.title, path: `/tests/${item.examSlug}/${item.slug}` })))]} />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-black tracking-tight text-primary sm:text-5xl">Mock test series for govt exams</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Full-length mocks that follow the real exam pattern, with solutions and analysis after every test.</p>
        <TrustBadges className="mt-6" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {series.map((item) => (
            <Link key={item.id} href={`/tests/${item.examSlug}/${item.slug}` as Route} className="group rounded-3xl border border-border bg-white p-6 shadow-soft transition hover:-translate-y-0.5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-success">{item.examName}</p>
              <h2 className="mt-2 text-2xl font-black text-primary">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.testCount} tests · {item.questionCount} questions{item.freeSampleCount ? " · free sample test" : ""}</p>
              <p className="mt-4 flex items-center justify-between text-xl font-black text-primary">{formatPrice(item.pricePaise)} <ArrowRight className="transition group-hover:translate-x-1" aria-hidden="true" /></p>
            </Link>
          ))}
          {!series.length && <p className="rounded-3xl bg-white p-6 text-muted shadow-soft">Test series are being prepared. Check back soon.</p>}
        </div>
      </section>
    </div>
  );
}
