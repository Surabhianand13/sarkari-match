import { requireUser } from "@/lib/auth/guards";
import { PolishedJobCard, SectionHeading } from "@/components/design-system";
import { demoJobs } from "@/lib/data/catalog";

export const metadata = { robots: { index: false, follow: false } };

export default async function MatchesPage() {
  await requireUser();
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SectionHeading eyebrow="Matches" title="Your strongest notification matches" body="These notifications are ordered as if your profile matched the demo graduate candidate." />
        <div className="grid gap-4 lg:grid-cols-2">
          {demoJobs.map((job, index) => <PolishedJobCard key={job.id} job={job} index={index} />)}
        </div>
      </div>
    </div>
  );
}
