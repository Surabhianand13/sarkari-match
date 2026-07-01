import { requireUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ButtonLink, EmptyState } from "@/components/design-system";
import { getJobs } from "@/lib/data/jobs";

export const metadata = { robots: { index: false, follow: false } };

async function saveJob(userId: string, postId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  await supabase.from("saved_jobs").upsert({ user_id: userId, post_id: postId }, { onConflict: "user_id,post_id", ignoreDuplicates: true });
}

async function getSavedJobIds(userId: string) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return new Set<string>();
  const { data } = await supabase.from("saved_jobs").select("post_id").eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.post_id));
}

export default async function SavedJobsPage({ searchParams }: { searchParams?: Promise<{ post?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const jobs = await getJobs();

  const targetJob = params?.post ? jobs.find((job) => job.slug === params.post) : undefined;
  if (targetJob) {
    await saveJob(user.id, targetJob.id);
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-3xl bg-white p-5 shadow-soft">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Saved</p>
          <h1 className="mt-2 text-3xl font-black text-primary">{targetJob.title}</h1>
          <p className="mt-3 text-muted">This notification is saved to your shortlist.</p>
          <div className="mt-5 flex flex-col gap-3 min-[390px]:flex-row">
            <ButtonLink href={`/jobs/${targetJob.slug}`}>View notification</ButtonLink>
            <ButtonLink href="/jobs" variant="secondary">Browse more notifications</ButtonLink>
          </div>
        </section>
      </div>
    );
  }

  const savedIds = await getSavedJobIds(user.id);
  const savedJobs = jobs.filter((job) => savedIds.has(job.id));

  if (!savedJobs.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState title="No saved notifications yet" body="Save govt job or exam notifications you want to compare or apply for later. Free users can save up to 3 notifications." actionHref="/jobs" actionLabel="Browse notifications" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-success">Saved</p>
      <h1 className="mt-2 text-3xl font-black text-primary">Your saved notifications</h1>
      <div className="mt-5 grid gap-4">
        {savedJobs.map((job) => (
          <section key={job.id} className="rounded-3xl bg-white p-5 shadow-soft">
            <h2 className="text-xl font-black text-primary">{job.title}</h2>
            <p className="mt-1 text-sm font-semibold text-muted">{job.organisation}</p>
            <ButtonLink href={`/jobs/${job.slug}`} className="mt-4">View notification</ButtonLink>
          </section>
        ))}
      </div>
    </div>
  );
}
