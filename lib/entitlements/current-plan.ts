import { getDb } from "@/lib/db";
import { planFeatures, type PlanCode } from "@/lib/entitlements/plans";

function isPlanCode(value: string): value is PlanCode {
  return value in planFeatures;
}

export async function getCurrentPlanCode(userId: string | null): Promise<PlanCode> {
  if (!userId) return "free";
  const db = await getDb();
  if (!db) return "free";

  const { rows } = await db.query<{ plan_code: string }>(
    `select plan_code from entitlements
     where user_id = $1 and active = true and (ends_at is null or ends_at > now())
     order by starts_at desc limit 1`,
    [userId]
  );
  const code = rows[0]?.plan_code;
  return code && isPlanCode(code) ? code : "free";
}
