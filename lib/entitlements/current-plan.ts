import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlanCode } from "@/lib/entitlements/plans";
import { planFeatures } from "@/lib/entitlements/plans";

function isPlanCode(value: string): value is PlanCode {
  return value in planFeatures;
}

export async function getCurrentPlanCode(userId: string | null): Promise<PlanCode> {
  if (!userId) return "free";

  const supabase = await createServerSupabaseClient();
  if (!supabase) return "free";

  const { data } = await supabase
    .from("entitlements")
    .select("plan_code, ends_at")
    .eq("user_id", userId)
    .eq("active", true)
    .order("starts_at", { ascending: false });

  const now = Date.now();
  const active = (data ?? []).find((row) => !row.ends_at || new Date(row.ends_at).getTime() > now);
  if (active && isPlanCode(active.plan_code)) return active.plan_code;
  return "free";
}
