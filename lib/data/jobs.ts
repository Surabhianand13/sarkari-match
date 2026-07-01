import { createServerSupabaseClient } from "@/lib/supabase/server";
import { demoJobs, getJobBySlug as getDemoJobBySlug, qualificationLabels, type JobPost } from "@/lib/data/catalog";
import type { PostRules } from "@/lib/matching/types";

type JobPostRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  vacancy_count: number | null;
  salary_text: string | null;
  application_status: JobPost["applicationStatus"];
  published_at: string | null;
  eligibility_rules: Partial<PostRules> | null;
  recruitments: {
    title: string;
    application_end_date: string | null;
    official_notification_url: string | null;
    official_application_url: string | null;
    verified_at: string | null;
    organisations: {
      name: string;
      departments: { name: string } | null;
      states: { name: string } | null;
    } | null;
  } | null;
};

function qualificationLabelFor(rules: Partial<PostRules> | null) {
  const minimumLevel = rules?.qualificationRules?.[0]?.minimumLevel;
  if (!minimumLevel) return "General";
  return qualificationLabels[minimumLevel] ?? minimumLevel;
}

function toJobPost(row: JobPostRow): JobPost {
  const organisation = row.recruitments?.organisations;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    recruitmentTitle: row.recruitments?.title ?? row.title,
    organisation: organisation?.name ?? "Unknown organisation",
    department: organisation?.departments?.name ?? "General",
    state: organisation?.states?.name ?? "Central Government",
    qualification: qualificationLabelFor(row.eligibility_rules),
    vacancyCount: row.vacancy_count ?? 0,
    salaryText: row.salary_text ?? "As per official notification",
    applicationEndDate: row.recruitments?.application_end_date ?? "",
    applicationStatus: row.application_status,
    publishedAt: row.published_at ?? "",
    verifiedAt: row.recruitments?.verified_at ?? row.published_at ?? "",
    officialApplicationUrl: row.recruitments?.official_application_url ?? "#",
    officialNotificationUrl: row.recruitments?.official_notification_url ?? "#",
    description: row.description ?? ""
  };
}

const JOB_POST_SELECT = `
  id, slug, title, description, vacancy_count, salary_text, application_status, published_at, eligibility_rules,
  recruitments!inner (
    title, application_end_date, official_notification_url, official_application_url, verified_at,
    organisations!inner ( name, departments ( name ), states ( name ) )
  )
`;

export async function getJobs(): Promise<JobPost[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoJobs;

  const { data, error } = await supabase
    .from("job_posts")
    .select(JOB_POST_SELECT)
    .eq("active", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error || !data) return demoJobs;
  return (data as unknown as JobPostRow[]).map(toJobPost);
}

export type MatchableJob = { job: JobPost; rules: PostRules };

const EMPTY_RULES: PostRules = { ageRules: [], qualificationRules: [], experienceRules: [], otherRules: [] };

function toPostRules(rules: Partial<PostRules> | null): PostRules {
  return { ...EMPTY_RULES, ...rules };
}

export async function getJobsForMatching(): Promise<MatchableJob[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return demoJobs.map((job) => ({ job, rules: EMPTY_RULES }));

  const { data, error } = await supabase
    .from("job_posts")
    .select(JOB_POST_SELECT)
    .eq("active", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (error || !data) return demoJobs.map((job) => ({ job, rules: EMPTY_RULES }));
  return (data as unknown as JobPostRow[]).map((row) => ({ job: toJobPost(row), rules: toPostRules(row.eligibility_rules) }));
}

export async function getJobBySlug(slug: string): Promise<JobPost | undefined> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return getDemoJobBySlug(slug);

  const { data, error } = await supabase
    .from("job_posts")
    .select(JOB_POST_SELECT)
    .eq("slug", slug)
    .eq("active", true)
    .not("published_at", "is", null)
    .maybeSingle();

  if (error || !data) return getDemoJobBySlug(slug);
  return toJobPost(data as unknown as JobPostRow);
}
