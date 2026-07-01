import crypto from "node:crypto";

export type ReferralEventType = "link_created" | "link_clicked" | "signup_attributed" | "first_payment_completed" | "reward_granted";

export type ReferralRewardConfig = {
  verifiedSignupSaveLimitBoost: number;
  paidReferralsForOneMonth: number;
  paidReferralsForOneYear: number;
};

export const defaultReferralRewardConfig: ReferralRewardConfig = {
  verifiedSignupSaveLimitBoost: 1,
  paidReferralsForOneMonth: 3,
  paidReferralsForOneYear: 10
};

export function createReferralCode(userId: string) {
  return crypto.createHash("sha256").update(`sarkarimatch:${userId}`).digest("base64url").slice(0, 10).toUpperCase();
}

export function canAttributeReferral({ referrerUserId, referredUserId, duplicateIdentity }: { referrerUserId: string; referredUserId: string; duplicateIdentity?: boolean }) {
  if (referrerUserId === referredUserId) return false;
  if (duplicateIdentity) return false;
  return true;
}

export function rewardsForPaidReferralCount(count: number, config = defaultReferralRewardConfig) {
  const rewards: string[] = [];
  if (count >= 1) rewards.push("verified_signup_save_limit_boost");
  if (count >= config.paidReferralsForOneMonth) rewards.push("one_month_pro_extension");
  if (count >= config.paidReferralsForOneYear) rewards.push("one_year_pro_extension");
  return rewards;
}
