import { z } from "zod";

export const extractedNotificationSchema = z.object({
  sourceUrl: z.string().url(),
  organisationName: z.string().trim().min(1),
  recruitmentTitle: z.string().trim().min(1),
  notificationNumber: z.string().trim().optional(),
  posts: z.array(
    z.object({
      title: z.string().trim().min(1),
      qualificationText: z.string().trim().min(1),
      ageText: z.string().trim().optional(),
      vacancyCount: z.number().int().nonnegative().optional()
    })
  ).min(1)
});

export type ExtractionReviewStatus = "draft" | "needs_review" | "approved" | "rejected";

export function publishAllowedForExtraction(status: ExtractionReviewStatus, humanVerified: boolean) {
  return status === "approved" && humanVerified;
}

export function validateExtractionPayload(payload: unknown) {
  return extractedNotificationSchema.safeParse(payload);
}
