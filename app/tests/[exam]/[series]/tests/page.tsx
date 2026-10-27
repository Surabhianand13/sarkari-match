import Link from "next/link";
import type { Route } from "next";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { TestRow } from "@/components/tests/test-row";
import { PAGE_SIZE, getSeries, getSeriesGroups, listSeriesTests } from "@/lib/tests/catalog";
import { groupHref, groupLabel } from "@/lib/tests/labels";

export const metadata: Metadata = { title: "All tests in this series", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function BrowseTestsPage({ params, searchParams }: { params: Promise<{ exam: string; series: string }>; searchParams: Promise<{ kind?: string; level?: string; page?: string }> }) {
  const [{ exam, series: slug }, query] = await Promise.all([params, searchParams]);
  const series = await getSeries(exam, slug);
  if (!series) notFound();
  const path = `/tests/${series.examSlug}/${series.slug}`;
  const groups = await getSeriesGroups(series.id);
  const active = groups.find((group) => group.kind === query.kind && (group.level ?? "all") === (query.level ?? "all")) ?? groups[0];
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const { tests, total } = active ? await listSeriesTests(series.id, { kind: active.kind, level: active.level ?? "all", page }) : { tests: [], total: 0 };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (target: number) => `${groupHref(path, active!)}&page=${target}` as Route;
  const crumbs = [{ name: "Home", path: "/" }, { name: "Test series", path: "/tests" }, { name: series.title, path }, { name: "All tests", path: `${path}/tests` }];

  return (
    <div className="bg-surface pb-12">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl font-black tracking-tight text-primary">{series.title}</h1>
        <p className="mt-1 text-muted">{series.testCount} tests in this series.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {groups.map((group) => {
            const on = group === active;
            return <Link key={`${group.kind}-${group.level}`} href={groupHref(path, group) as Route} className={`rounded-full px-4 py-2 text-sm font-black ${on ? "bg-primary text-white" : "bg-white text-primary shadow-soft hover:bg-mint"}`}>{groupLabel(group)} ({group.count})</Link>;
          })}
        </div>
        <ul className="mt-6 grid gap-3">{tests.map((test) => <li key={test.id}><TestRow test={test} basePath={path} /></li>)}</ul>
        {pages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-between text-sm font-black text-primary">
            {page > 1 ? <Link href={pageHref(page - 1)} className="underline">Previous</Link> : <span />}
            <span className="text-muted">Page {page} of {pages}</span>
            {page < pages ? <Link href={pageHref(page + 1)} className="underline">Next</Link> : <span />}
          </nav>
        )}
      </div>
    </div>
  );
}
