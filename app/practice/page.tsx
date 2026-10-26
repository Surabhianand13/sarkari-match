import { JsonLd } from "@/components/seo/json-ld";
import { SubjectCard } from "@/components/practice/subject-card";
import { getOptionalUser } from "@/lib/auth/guards";
import { getLevels, getSubjects } from "@/lib/practice";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Practice Questions for SSC CGL: Adaptive Question Bank",
  description: "Practise SSC CGL questions by subject and topic. The difficulty adapts to your accuracy, with an instant solution after every answer.",
  path: "/practice"
});

export default async function PracticePage() {
  const [user, subjects] = await Promise.all([getOptionalUser(), getSubjects()]);
  const levels = user ? await getLevels(user.id) : {};
  return (
    <div className="bg-surface">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Practice", path: "/practice" }])} />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-success">Question bank</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-5xl">Adaptive practice</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Ten questions at a time with an instant solution after every answer. Score 70% or more in three sessions in a row and the questions get harder.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {subjects.map((item) => (
            <SubjectCard key={item.subject} subject={item.subject} questions={item.questions} topics={item.topics} level={levels[item.subject]?.level ?? "beginner"} goodSessions={levels[item.subject]?.goodSessions ?? 0} signedIn={Boolean(user)} />
          ))}
          {!subjects.length && <p className="rounded-3xl bg-white p-6 text-muted shadow-soft md:col-span-2">Practice questions are being prepared. Check back soon.</p>}
        </div>
      </section>
    </div>
  );
}
