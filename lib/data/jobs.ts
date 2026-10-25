import { getDb } from "@/lib/db";
import { demoJobs, getJobBySlug as getDemoJobBySlug, qualificationLabels, type JobPost } from "@/lib/data/catalog";
import type { PostRules } from "@/lib/matching/types";

export type JobPostRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  vacancy_count: number | null;
  salary_text: string | null;
  application_status: JobPost["applicationStatus"];
  published_at: string | null;
  eligibility_rules: Partial<PostRules> | null;
  recruitment_title: string | null;
  application_end_date: string | null;
  official_notification_url: string | null;
  official_application_url: string | null;
  verified_at: string | null;
  organisation_name: string | null;
  department_name: string | null;
  state_name: string | null;
};

function qualificationLabelFor(rules: Partial<PostRules> | null) {
  const minimumLevel = rules?.qualificationRules?.[0]?.minimumLevel;
  if (!minimumLevel) return "General";
  return qualificationLabels[minimumLevel] ?? minimumLevel;
}

export function toJobPost(row: JobPostRow): JobPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    recruitmentTitle: row.recruitment_title ?? row.title,
    organisation: row.organisation_name ?? "Unknown organisation",
    department: row.department_name ?? "General",
    state: row.state_name ?? "Central Government",
    qualification: qualificationLabelFor(row.eligibility_rules),
    vacancyCount: row.vacancy_count ?? 0,
    salaryText: row.salary_text ?? "As per official notification",
    applicationEndDate: row.application_end_date ?? "",
    applicationStatus: row.application_status,
    publishedAt: row.published_at ?? "",
    verifiedAt: row.verified_at ?? row.published_at ?? "",
    officialApplicationUrl: row.official_application_url ?? "#",
    officialNotificationUrl: row.official_notification_url ?? "#",
    description: row.description ?? ""
  };
}

const iso = (column: string) => `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

// Only published notifications from active organisations are public.
const JOB_POST_SELECT = `
  select jp.id, jp.slug, jp.title, jp.description, jp.vacancy_count, jp.salary_text, jp.application_status,
         ${iso("jp.published_at")} as published_at, jp.eligibility_rules,
         r.title as recruitment_title, r.application_end_date::text as application_end_date,
         r.official_notification_url, r.official_application_url, ${iso("r.verified_at")} as verified_at,
         o.name as organisation_name, d.name as department_name, s.name as state_name
  from job_posts jp
  join recruitments r on r.id = jp.recruitment_id and r.editorial_status = 'published'
  join organisations o on o.id = r.organisation_id and o.active = true
  left join departments d on d.id = o.department_id
  left join states s on s.id = o.state_id
  where jp.active = true and jp.published_at is not null`;

async function fetchRows(extraWhere = "", params: unknown[] = []): Promise<JobPostRow[] | null> {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<JobPostRow>(`${JOB_POST_SELECT} ${extraWhere} order by jp.published_at desc`, params);
  return rows;
}

export async function getJobs(): Promise<JobPost[]> {
  const rows = await fetchRows();
  if (!rows) return demoJobs;
  return rows.map(toJobPost);
}

export type MatchableJob = { job: JobPost; rules: PostRules };

const EMPTY_RULES: PostRules = { ageRules: [], qualificationRules: [], experienceRules: [], otherRules: [] };

function toPostRules(rules: Partial<PostRules> | null): PostRules {
  return { ...EMPTY_RULES, ...rules };
}

export async function getJobsForMatching(): Promise<MatchableJob[]> {
  const rows = await fetchRows();
  if (!rows) return demoJobs.map((job) => ({ job, rules: EMPTY_RULES }));
  return rows.map((row) => ({ job: toJobPost(row), rules: toPostRules(row.eligibility_rules) }));
}

export async function getJobBySlug(slug: string): Promise<JobPost | undefined> {
  const found = await getJobWithRulesBySlug(slug);
  return found?.job;
}

export async function getJobWithRulesBySlug(slug: string): Promise<MatchableJob | undefined> {
  const rows = await fetchRows("and jp.slug = $1", [slug]);
  if (!rows) {
    const demo = getDemoJobBySlug(slug);
    return demo ? { job: demo, rules: EMPTY_RULES } : undefined;
  }
  const row = rows[0];
  return row ? { job: toJobPost(row), rules: toPostRules(row.eligibility_rules) } : undefined;
}
