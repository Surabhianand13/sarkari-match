import { getDb } from "@/lib/db";
import type { JobPost } from "@/lib/data/catalog";
import type { CandidateProfile, MatchResult } from "./types";

export async function persistCandidateMatches(
  userId: string,
  profile: CandidateProfile,
  results: Array<{ job: JobPost; result: MatchResult }>
) {
  const db = await getDb();
  if (!db) return;

  await db.transaction(async (tx) => {
    const existing = await tx.query<{ id: string }>("select id from candidate_profiles where user_id = $1 order by created_at asc limit 1", [userId]);
    let profileId = existing.rows[0]?.id;
    if (profileId) {
      await tx.query("update candidate_profiles set date_of_birth = $1, category = $2, updated_at = now() where id = $3", [profile.dateOfBirth || null, profile.category, profileId]);
    } else {
      const inserted = await tx.query<{ id: string }>("insert into candidate_profiles (user_id, date_of_birth, category) values ($1, $2, $3) returning id", [userId, profile.dateOfBirth || null, profile.category]);
      profileId = inserted.rows[0].id;
    }

    await tx.query("delete from user_qualifications where user_id = $1", [userId]);
    for (const qualification of profile.qualifications) {
      await tx.query(
        `insert into user_qualifications (user_id, candidate_profile_id, qualification_level_id, degree, specialisation, passing_year, final_year)
         values ($1, $2, (select id from qualification_levels where slug = $3), $4, $5, $6, $7)`,
        [userId, profileId, qualification.level, qualification.degree ?? null, qualification.specialisation ?? null, qualification.passingYear ?? null, qualification.finalYear ?? false]
      );
    }

    await tx.query("delete from match_results where user_id = $1", [userId]);
    for (const { job, result } of results) {
      await tx.query(
        `insert into match_results (user_id, candidate_profile_id, post_id, status, score, explanation_json, rules_version)
         values ($1, $2, $3, $4, $5, $6, 'v1')`,
        [userId, profileId, job.id, result.status, result.score, JSON.stringify(result)]
      );
    }
  });
}
