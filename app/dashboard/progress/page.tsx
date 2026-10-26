import Link from "next/link";
import type { Route } from "next";
import { Flame, Target } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { LevelStepper } from "@/components/practice/level-stepper";
import { requireUser } from "@/lib/auth/guards";
import { getLevels } from "@/lib/practice";
import { getProgress } from "@/lib/progress";
import { buildStudyPlan } from "@/lib/study-plan";

export const metadata = { title: "My progress", robots: { index: false, follow: false } };

function streakOf(activity: Array<{ count: number }>) {
  let streak = 0;
  for (let i = activity.length - 1; i >= 0; i--) {
    if (activity[i].count > 0) streak++;
    else if (i !== activity.length - 1) break;
  }
  return streak;
}

export default async function ProgressPage() {
  const user = await requireUser();
  const [progress, levels] = await Promise.all([getProgress(user.id), getLevels(user.id)]);
  const plan = buildStudyPlan(progress.weakTopics, progress.totals.tests > 0);
  const hasData = progress.totals.questionsAnswered > 0;
  const streak = streakOf(progress.activity);
  const maxActivity = Math.max(1, ...progress.activity.map((day) => day.count));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-primary">My progress</h1>
      <p className="mt-1 text-muted">Built from your submitted tests and practice answers.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[["Tests taken", progress.totals.tests], ["Practice sessions", progress.totals.practiceSessions], ["Questions answered", progress.totals.questionsAnswered], ["Day streak", streak]].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl bg-white p-4 shadow-soft">
            <p className="flex items-center gap-2 text-3xl font-black text-primary">{label === "Day streak" && <Flame className="text-amber" size={24} aria-hidden="true" />}{(value as number).toLocaleString("en-IN")}</p>
            <p className="text-sm font-bold text-muted">{label as string}</p>
          </div>
        ))}
      </div>

      {!hasData && (
        <div className="mt-6 rounded-3xl bg-mint p-6">
          <p className="text-lg font-black text-primary">Your charts start after your first test or practice session.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/tests" className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-black text-white">Take the free sample test</Link>
            <Link href="/practice" className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-black text-primary">Start practising</Link>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-soft" aria-labelledby="activity-h">
          <h2 id="activity-h" className="text-lg font-black text-primary">Activity, last 4 weeks</h2>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {progress.activity.map((day) => (
              <div key={day.date} title={`${day.date}: ${day.count} session${day.count === 1 ? "" : "s"}`} className="aspect-square rounded-md" style={{ background: day.count ? `rgba(24,185,67,${0.3 + (0.7 * day.count) / maxActivity})` : "#EEF2F7" }} />
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-muted">Each square is a day. Darker means more tests and practice sessions.</p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-soft" aria-labelledby="trend-h">
          <h2 id="trend-h" className="text-lg font-black text-primary">Mock test scores</h2>
          {progress.trend.length ? (
            <div className="mt-4 flex h-40 items-end gap-2">
              {progress.trend.map((point, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={point.title}>
                  <span className="text-xs font-black text-primary">{point.percent}%</span>
                  <div className="bar-grow w-full rounded-t-lg bg-[linear-gradient(180deg,#18B943,#0D9488)]" style={{ height: `${Math.max(4, point.percent)}%`, animationDelay: `${i * 80}ms` }} />
                  <span className="text-[0.65rem] font-bold text-muted">{point.label}</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-4 text-sm text-muted">Take a mock test to see your score trend.</p>}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-soft" aria-labelledby="subject-h">
          <h2 id="subject-h" className="text-lg font-black text-primary">Accuracy by subject</h2>
          <div className="mt-4 grid gap-4">
            {progress.subjects.map((item) => (
              <div key={item.subject}>
                <div className="flex justify-between text-sm font-black text-primary"><span>{item.subject}</span><span>{item.accuracy}%</span></div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-brand-green" style={{ width: `${item.accuracy}%` }} /></div>
                <p className="mt-0.5 text-xs font-semibold text-muted">{item.correct} of {item.attempted} correct</p>
              </div>
            ))}
            {!progress.subjects.length && <p className="text-sm text-muted">No answers yet.</p>}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-soft" aria-labelledby="weak-h">
          <h2 id="weak-h" className="flex items-center gap-2 text-lg font-black text-primary"><Target size={18} aria-hidden="true" /> Topics to work on</h2>
          <ul className="mt-4 grid gap-2">
            {progress.weakTopics.map((item) => (
              <li key={`${item.subject}-${item.topic}`} className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3 text-sm">
                <span><span className="font-black text-primary">{item.topic}</span><span className="block text-xs font-semibold text-muted">{item.subject} · {item.attempted} answered</span></span>
                <span className="font-black text-error">{item.accuracy}%</span>
              </li>
            ))}
            {!progress.weakTopics.length && <li className="text-sm text-muted">Answer a few more questions in a topic and your weakest ones show up here.</li>}
          </ul>
        </section>
      </div>

      {Object.keys(levels).length > 0 && (
        <section className="mt-5 rounded-3xl bg-white p-6 shadow-soft">
          <h2 className="text-lg font-black text-primary">Practice levels</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {Object.entries(levels).map(([subject, value]) => (
              <div key={subject}><p className="mb-2 text-sm font-black text-primary">{subject}</p><LevelStepper level={value.level} goodSessions={value.goodSessions} /></div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="plan-h">
        <h2 id="plan-h" className="text-2xl font-black text-primary">Your 7-day study plan</h2>
        <p className="mt-1 text-sm text-muted">{hasData ? "Built from your weakest topics. It updates as your results change." : "A starter plan. It personalises itself once you have answered some questions."}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plan.map((day, i) => (
            <Reveal key={day.day} delay={i * 60}>
              <div className="h-full rounded-3xl border border-border bg-white p-5 shadow-soft">
                <p className="text-xs font-black uppercase tracking-wide text-success">Day {day.day}</p>
                <p className="mt-1 font-black text-primary">{day.title}</p>
                <ul className="mt-3 grid gap-2">
                  {day.tasks.map((task) => (
                    <li key={task.label}><Link href={task.href as Route} className="flex items-start justify-between gap-3 rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-primary hover:bg-mint"><span>{task.label}</span><span className="shrink-0 text-xs font-black text-muted">{task.minutes} min</span></Link></li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
