import { revalidatePath } from "next/cache";
import { notifyIndexNow } from "@/lib/indexnow";

// Public pages are statically cached for an hour; admin changes refresh them immediately.
// Pass the paths that were published or changed so search engines that support IndexNow hear about them straight away.
export function revalidatePublicContent(changedPaths: ReadonlyArray<string> = []) {
  revalidatePath("/", "layout");
  revalidatePath("/jobs", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/llms.txt");
  revalidatePath("/llms-full.txt");
  revalidatePath("/tests", "layout");
  revalidatePath("/pricing");
  notifyIndexNow(changedPaths);
}

type Queryable = { query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }> };

// The job pages that go live when a recruitment is published, plus the lists that now show them.
export async function jobPathsForRecruitment(db: Queryable, recruitmentId: string) {
  const { rows } = await db.query<{ slug: string }>("select slug from job_posts where recruitment_id = $1 and active = true and published_at is not null", [recruitmentId]);
  return [...rows.map((row) => `/jobs/${row.slug}`), "/jobs"];
}
