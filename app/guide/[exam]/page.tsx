import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { BookOpenCheck, CalendarCheck, MessageCircle, Target } from "lucide-react";
import { GuideChat } from "@/components/guide/guide-chat";
import { getOptionalUser } from "@/lib/auth/guards";
import { getGuideHistory, guideLimits } from "@/lib/guide/service";
import { getGuideStatus } from "@/lib/offers";
import { formatPrice, getExam } from "@/lib/tests/catalog";

export const metadata = { title: "AI Study Guide", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GuidePage({ params }: { params: Promise<{ exam: string }> }) {
  const { exam: examSlug } = await params;
  const exam = await getExam(examSlug);
  if (!exam) notFound();
  const user = await getOptionalUser();
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/guide/${exam.slug}`)}` as Route);
  const status = await getGuideStatus(user.id, exam.id);
  if (!status.enabled) notFound();

  if (status.owned) {
    const [history, left] = await Promise.all([getGuideHistory(user.id, exam.id), guideLimits(user.id, exam.id)]);
    return (
      <div className="bg-surface px-4 py-6">
        <GuideChat examSlug={exam.slug} examName={exam.name} initial={history.map((message) => ({ role: message.role, content: message.content, deep: message.tier === "deep" }))} left={left} />
      </div>
    );
  }

  const perks = [
    [MessageCircle, "An AI tutor that knows your results", "Ask what to study, why you lost marks and how to fix it. It sees your accuracy by topic for this exam."],
    [Target, "Deeper explanations on demand", "Step-by-step worked solutions for the questions that stump you."],
    [CalendarCheck, "A plan that adapts", "Your weekly plan and revision focus follow your latest results."],
    [BookOpenCheck, "Built for this exam", `Knows the ${exam.name} pattern and sections.`]
  ] as const;
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-success">AI Study Guide</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-primary">Your study coach for {exam.name}</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {perks.map(([Icon, title, body]) => (
            <div key={title} className="rounded-3xl border border-border bg-white p-5 shadow-soft">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-mint text-success"><Icon size={22} aria-hidden="true" /></span>
              <h2 className="mt-3 font-black text-primary">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-3xl bg-white p-6 shadow-lift">
          {status.canBuy && status.pricePaise !== null ? (
            <>
              <p className="flex items-end gap-3"><span className="text-4xl font-black text-primary">{formatPrice(status.pricePaise)}</span>{status.mrpPaise && status.mrpPaise > status.pricePaise && <span className="pb-1 text-lg font-bold text-muted line-through">{formatPrice(status.mrpPaise)}</span>}<span className="pb-1 text-sm font-bold text-muted">for {Math.round(status.validityDays / 30)} months</span></p>
              <Link href={`/checkout/guide/${exam.slug}` as Route} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#18B943,#0D9488)] px-5 text-sm font-black text-white shadow-green">Get the AI Study Guide</Link>
            </>
          ) : (
            <>
              <p className="font-black text-primary">The AI Study Guide comes with the {exam.name} Exam Pass.</p>
              <p className="mt-1 text-sm text-muted">It works from your test results, so get the Pass first.</p>
              <Link href={`/tests/${exam.slug}` as Route} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-black text-white">See the {exam.name} Pass</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
