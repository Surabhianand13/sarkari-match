import { getDb } from "@/lib/db";

export type AdminStats = {
  publishedNotifications: number;
  draftRecruitments: number;
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
    select
      (select count(*) from job_posts where active and published_at is not null) as "publishedNotifications",
      (select count(*) from recruitments where editorial_status in ('draft','needs_review','reviewed')) as "draftRecruitments",
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
