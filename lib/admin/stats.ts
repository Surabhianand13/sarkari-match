import { getDb } from "@/lib/db";

export type AdminStats = {
  activeNotifications: number;
  activePosts: number;
  upcomingNotifications: number;
  pastNotifications: number;
  publishedNotifications: number;
  draftRecruitments: number;
  leadsPending: number;
  sourceUpdates: number;
  closingSoon: number;
  reportsOpen: number;
  questionsAwaitingReview: number;
  publishedQuestions: number;
  publishedSeries: number;
  users: number;
  activeAccess: number;
};

export async function getAdminStats(): Promise<AdminStats | null> {
  const db = await getDb();
  if (!db) return null;
  const { rows } = await db.query<Record<keyof AdminStats, string>>(`
    with live as (
      select jp.recruitment_id,
             case when jp.application_status = 'closed' or r.application_end_date < (now() at time zone 'Asia/Kolkata')::date then 'past'
                  when r.application_start_date > (now() at time zone 'Asia/Kolkata')::date or (r.application_start_date is null and jp.application_status = 'upcoming') then 'upcoming'
                  else 'open' end as state
      from job_posts jp
      join recruitments r on r.id = jp.recruitment_id and r.editorial_status = 'published'
      join organisations o on o.id = r.organisation_id and o.active
      where jp.active and jp.published_at is not null
    )
    select
      (select count(distinct recruitment_id) from live where state = 'open') as "activeNotifications",
      (select count(*) from live where state = 'open') as "activePosts",
      (select count(distinct recruitment_id) from live where state = 'upcoming') as "upcomingNotifications",
      (select count(distinct recruitment_id) from live where recruitment_id not in (select recruitment_id from live where state <> 'past')) as "pastNotifications",
      (select count(*) from job_posts where active and published_at is not null) as "publishedNotifications",
      (select count(*) from recruitments where editorial_status in ('draft','needs_review','reviewed')) as "draftRecruitments",
      (select count(*) from notification_leads where status = 'pending' and detail_captured) as "leadsPending",
      (select count(*) from notification_leads where jsonb_array_length(source_updates) > 0 and (updates_seen_at is null or updates_seen_at < (source_updates->-1->>'at')::timestamptz)) as "sourceUpdates",
      (select count(*) from job_posts jp join recruitments r on r.id = jp.recruitment_id
         where jp.active and r.application_end_date between current_date and current_date + 7) as "closingSoon",
      (select count(*) from reports where status = 'open') as "reportsOpen",
      (select count(*) from questions where validation_status in ('auto_passed','needs_review')) as "questionsAwaitingReview",
      (select count(*) from questions where validation_status = 'published') as "publishedQuestions",
      (select count(*) from test_series where status = 'published') as "publishedSeries",
      (select count(*) from users) as "users",
      (select count(*) from test_access where expires_at is null or expires_at > now()) as "activeAccess"`);
  const row = rows[0];
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as AdminStats;
}

export async function getRecentAudit(limit = 8) {
  const db = await getDb();
  if (!db) return [];
  const { rows } = await db.query<{ id: string; action: string; entity_type: string; created_at: string; actor_email: string | null }>(
    `select a.id, a.action, a.entity_type, a.created_at::text, u.email as actor_email
     from audit_logs a left join users u on u.id = a.actor_id order by a.created_at desc limit $1`,
    [limit]
  );
  return rows;
}
