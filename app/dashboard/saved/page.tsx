import { requireUser } from "@/lib/auth/guards";
import { ButtonLink, EmptyState } from "@/components/design-system";
import { demoJobs } from "@/lib/data/catalog";

export const metadata = { robots: { index: false, follow: false } };

export default async function SavedJobsPage({ searchParams }: { searchParams?: Promise<{ post?: string }> }) {
  await requireUser();
  const params = await searchParams;
  const savedJob = demoJobs.find((job) => job.slug === params?.post);
  if (savedJob) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Saved</p>
          <h1 className="mt-2 text-3xl font-black text-primary">{savedJob.title}</h1>
          <p className="mt-3 text-muted">This notification is saved to your demo shortlist. Connect Supabase persistence to store saved notifications across devices.</p>
          <div className="mt-5 flex flex-col gap-3 min-[390px]:flex-row">
            <ButtonLink href={`/jobs/${savedJob.slug}`}>View notification</ButtonLink>
            <ButtonLink href="/jobs" variant="secondary">Browse more notifications</ButtonLink>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <EmptyState title="No saved notifications yet" body="Save govt job or exam notifications you want to compare or apply for later. Free users can save up to 3 notifications." actionHref="/jobs" actionLabel="Browse notifications" />
    </div>
  );
}
