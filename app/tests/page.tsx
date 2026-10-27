import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { WaitlistForm } from "@/components/waitlist-form";
import { TrustBadges } from "@/components/tests/trust-blocks";
import { getExamFamilies } from "@/lib/exams/live";
import { discountPercent, formatPrice, getPublishedSeries } from "@/lib/tests/catalog";
import { breadcrumbJsonLd, buildMetadata, itemListJsonLd } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "Mock Test Series for Govt Exams: SSC CGL and More",
  description: "Affordable full-length mock tests and sectional tests for SSC CGL and other govt exams. Expert-written, AI-checked, with solutions and analysis. Try a free sample test.",
  path: "/tests"
});

export default async function TestsHubPage() {
  const [series, examFamilies] = await Promise.all([getPublishedSeries(), getExamFamilies()]);
  const crumbs = [{ name: "Home", path: "/" }, { name: "Test series", path: "/tests" }];
  return (
    <div className="bg-surface">
      <JsonLd data={[breadcrumbJsonLd(crumbs), itemListJsonLd("Mock test series", series.map((item) => ({ name: item.title, path: `/tests/${item.examSlug}/${item.slug}` })))]} />
      <section className="mx-auto max-w-7xl px-4 pb-4 pt-8 sm:pt-12">
        <h1 className="text-3xl font-black tracking-tight text-primary sm:text-5xl">Mock test series for govt exams</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Full-length mocks that follow the real exam pattern, with solutions and analysis after every test.</p>
        <TrustBadges className="mt-6" />
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[17rem_1fr]">
        <aside aria-label="Exam categories">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-muted">Exam categories</p>
          <ul className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible">
            {examFamilies.map((family) => (
              <li key={family.name} className="shrink-0">
                <div className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-black ${!family.comingSoon ? "border-[rgba(24,185,67,0.4)] bg-mint text-primary" : "border-border bg-white text-muted"}`}>
                  {family.name}
                  {family.comingSoon && <span className="rounded-full bg-surface px-2 py-0.5 text-[0.65rem] uppercase tracking-wide">Soon</span>}
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <div>
          <h2 className="text-2xl font-black text-primary">Available test series</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {series.map((item) => {
              const discount = discountPercent(item.pricePaise, item.mrpPaise);
              return (
                <Link key={item.id} href={`/tests/${item.examSlug}/${item.slug}` as Route} className="group flex flex-col rounded-3xl border border-border bg-white p-6 shadow-soft transition hover:-translate-y-0.5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-success">{item.examName}</p>
                  <h3 className="mt-2 text-2xl font-black text-primary">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted">{item.testCount} tests · {item.questionCount} questions</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                    {item.freeSampleCount > 0 && <span className="rounded-full bg-mint px-2.5 py-1 text-success">Free sample test</span>}
                    <span className="rounded-full bg-surface px-2.5 py-1 text-primary">Solutions + analysis</span>
                  </div>
                  <p className="mt-5 flex items-end justify-between text-2xl font-black text-primary">
                    <span>{formatPrice(item.pricePaise)}{item.mrpPaise && discount > 0 && <span className="ml-2 text-sm font-bold text-muted line-through">{formatPrice(item.mrpPaise)}</span>}{discount > 0 && <span className="ml-2 text-xs font-black text-success">{discount}% off</span>}</span>
                    <ArrowRight className="transition group-hover:translate-x-1" aria-hidden="true" />
                  </p>
                </Link>
              );
            })}
            {!series.length && (
              <div className="rounded-3xl bg-white p-6 shadow-soft md:col-span-2">
                <p className="text-lg font-black text-primary">SSC CGL mock tests are launching soon</p>
                <p className="mt-1 text-sm text-muted">Leave your email and we will tell you the day they open.</p>
                <div className="mt-4"><WaitlistForm source="tests-page" /></div>
              </div>
            )}
          </div>

          <h2 className="mt-10 text-2xl font-black text-primary">More exams on the way</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {examFamilies.filter((family) => family.comingSoon).map((family) => (
              <div key={family.name} className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-white/70 px-4 py-3 text-sm font-black text-muted">
                {family.name}
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs uppercase tracking-wide">Coming soon</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
