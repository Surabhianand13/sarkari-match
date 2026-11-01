import { cookies } from "next/headers";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/design-system";
import { Inline, Rich } from "@/components/rich-text";
import { FactMonth } from "@/components/fact-month";
import { QuestionFigure } from "@/components/question-figure";
import { SetStimulus } from "@/components/set-stimulus";
import { SolutionText } from "@/components/solution-text";
import { StartTestButton } from "@/components/tests/start-test-button";
import { requireUser } from "@/lib/auth/guards";
import { localize, solutionFor, toLang } from "@/lib/localize";
import { getResultData } from "@/lib/tests/attempts";

export const metadata = { title: "Your result", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const minutes = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

export default async function ResultPage({ params, searchParams }: { params: Promise<{ attemptId: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { attemptId } = await params;
  const { lang: langParam } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const user = await requireUser();
  const data = await getResultData(user.id, attemptId);
  if (!data) notFound();
  const { result } = data;
  const lang = toLang(langParam ?? (await cookies()).get("sarkari_locale")?.value);
  const anyHindi = data.solutions.some((solution) => solution.hi);
  const testPath = `/tests/${data.examSlug}/${data.seriesSlug}/${data.testSlug}`;

  return (
    <div className="bg-surface pb-12">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-success">{data.seriesTitle}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-primary">{data.testTitle}: your result</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[["Score", `${result.score} / ${result.maxScore}`], ["Accuracy", `${result.accuracy}%`], ["Attempted", `${result.attempted} of ${result.attempted + result.unattempted}`], ["Time", minutes(data.timeSpentSeconds)]].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-4 shadow-soft"><p className="text-xs font-black uppercase tracking-wide text-muted">{label}</p><p className="mt-1 text-2xl font-black text-primary">{value}</p></div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm font-black">
          <p className="flex items-center gap-2 rounded-2xl bg-mint px-4 py-3 text-success"><CheckCircle2 size={18} aria-hidden="true" /> {result.correct} correct</p>
          <p className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-error"><XCircle size={18} aria-hidden="true" /> {result.incorrect} wrong</p>
          <p className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-muted shadow-soft"><CircleSlash size={18} aria-hidden="true" /> {result.unattempted} not attempted</p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-black text-primary">Section-wise</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-wide text-muted"><tr><th className="py-2">Section</th><th>Score</th><th>Accuracy</th></tr></thead>
              <tbody className="divide-y divide-border">{result.bySection.map((s) => <tr key={s.name}><td className="py-2 font-bold text-primary">{s.name}</td><td>{s.score} / {s.maxScore}</td><td>{s.accuracy}%</td></tr>)}</tbody>
            </table>
          </section>
          <section className="rounded-3xl bg-white p-5 shadow-soft">
            <h2 className="text-lg font-black text-primary">Topics to revise (weakest first)</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {result.byTopic.slice(0, 6).map((t) => (
                <li key={t.name} className="flex justify-between gap-3"><span className="font-bold text-primary">{t.name}</span><span className="text-muted">{t.correct}/{t.correct + t.incorrect + t.unattempted} correct · {t.accuracy}%</span></li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <StartTestButton testId={data.testId} returnPath={testPath} checkoutPath={`/checkout/test/${data.seriesSlug}`} label="Attempt again" />
          <ButtonLink href={`/tests/${data.examSlug}/${data.seriesSlug}` as Route} variant="secondary">Back to the series</ButtonLink>
          <ButtonLink href="/dashboard/tests" variant="secondary">All my tests</ButtonLink>
        </div>

        <section className="mt-10" aria-labelledby="solutions-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="solutions-heading" className="text-2xl font-black tracking-tight text-primary">Solutions</h2>
            {anyHindi && (
              <div role="group" aria-label="Solution language" className="inline-flex rounded-full border border-border bg-white p-0.5 text-xs font-black">
                {([["en", "English"], ["hi", "हिन्दी"]] as const).map(([value, label]) => (
                  <Link key={value} href={`?lang=${value}` as Route} lang={value} aria-current={lang === value ? "true" : undefined} className={`inline-flex min-h-8 items-center rounded-full px-3 ${lang === value ? "bg-primary text-white" : "text-primary"}`}>{label}</Link>
                ))}
              </div>
            )}
          </div>
          <ol className="mt-4 grid gap-4">
            {data.solutions.map((solution, position) => {
              const view = localize(solution, lang);
              return (
              <li key={solution.id} lang={view.translated ? "hi" : undefined} className="rounded-3xl bg-white p-5 shadow-soft">
                <p className="text-xs font-black uppercase tracking-wide text-muted">Q{position + 1} · {solution.section} · {solution.topic}</p>
                <div className="mt-2"><FactMonth value={solution.factMonth} lang={view.translated ? "hi" : "en"} /></div>
                {view.set && (position > 0 && data.solutions[position - 1].set?.id === view.set.id
                  ? <p className="mt-2 rounded-xl bg-surface px-3 py-2 text-xs font-bold text-muted">{view.translated ? "ऊपर के प्रश्न के साथ दिए गए आँकड़ों का उपयोग करें।" : "Uses the data shown with the question above."}</p>
                  : <div className="mt-2"><SetStimulus set={view.set} lang={view.translated ? "hi" : "en"} /></div>)}
                <QuestionFigure figure={view.figure} image={solution.image} />
                <Rich text={view.stem} className="mt-2 font-bold text-foreground" />
                <ul className="mt-3 grid gap-2 text-sm">
                  {Object.keys(solution.options).map((key) => {
                    const text = view.options[key] ?? solution.options[key];
                    const isCorrect = key === solution.correct;
                    const isChosen = key === solution.selected;
                    return (
                      <li key={key} className={`rounded-xl px-3 py-2 font-semibold ${isCorrect ? "bg-mint text-success" : isChosen ? "bg-red-50 text-error" : "bg-surface text-muted"}`}>
                        {key}) <Inline text={text} />{isCorrect ? " (correct)" : ""}{isChosen && !isCorrect ? " (your answer)" : ""}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 rounded-xl bg-surface p-3 text-sm leading-6 text-muted"><p className="mb-1.5 text-xs font-black uppercase tracking-wide text-success">Solution</p><SolutionText text={solutionFor(solution, lang)} /></div>
              </li>
              );
            })}
          </ol>
        </section>
        <p className="mt-8 text-center text-xs font-semibold text-muted">Found a mistake in a question? <Link href="/report-error" className="underline">Tell us</Link> and we will review it.</p>
      </div>
    </div>
  );
}
