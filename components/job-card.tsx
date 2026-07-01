import type { JobPost } from "@/lib/data/catalog";
import { PolishedJobCard } from "@/components/design-system";

export function JobCard({ job, index = 0 }: { job: JobPost; index?: number }) {
  return <PolishedJobCard job={job} index={index} />;
}
