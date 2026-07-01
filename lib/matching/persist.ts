import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { JobPost } from "@/lib/data/catalog";
import type { CandidateProfile, MatchResult } from "./types";

export async function persistCandidateMatches(
  userId: string,
  profile: CandidateProfile,
  results: Array<{ job: JobPost; result: MatchResult }>
) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;

  const { data: existingProfile } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const profilePayload = {
    user_id: userId,
    date_of_birth: profile.dateOfBirth || null,
    category: profile.category
  };

  let profileId: string | undefined = existingProfile?.id;
  if (profileId) {
    await supabase.from("candidate_profiles").update(profilePayload).eq("id", profileId);
  } else {
    const { data: inserted } = await supabase.from("candidate_profiles").insert(profilePayload).select("id").single();
    profileId = inserted?.id;
  }

  if (!profileId) return;

  await supabase.from("user_qualifications").delete().eq("user_id", userId);
  if (profile.qualifications.length) {
    const slugs = profile.qualifications.map((q) => q.level);
    const { data: levels } = await supabase.from("qualification_levels").select("id, slug").in("slug", slugs);
    const levelIdBySlug = new Map((levels ?? []).map((level) => [level.slug, level.id]));
    await supabase.from("user_qualifications").insert(
      profile.qualifications.map((q) => ({
        user_id: userId,
        candidate_profile_id: profileId,
        qualification_level_id: levelIdBySlug.get(q.level) ?? null,
        degree: q.degree ?? null,
        specialisation: q.specialisation ?? null,
        passing_year: q.passingYear ?? null,
        final_year: q.finalYear ?? false
      }))
    );
  }

  const admin = createAdminSupabaseClient();
  if (!admin) return;
  await admin.from("match_results").delete().eq("user_id", userId);
  if (results.length) {
    await admin.from("match_results").insert(
      results.map(({ job, result }) => ({
        user_id: userId,
        candidate_profile_id: profileId,
        post_id: job.id,
        status: result.status,
        score: result.score,
        explanation_json: result,
        rules_version: "v1"
      }))
    );
  }
}
