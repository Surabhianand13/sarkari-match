import { addDays, isBefore, parseISO } from "date-fns";
import { z } from "zod";

export const applicationStatuses = [
  "interested",
  "saved",
  "application_started",
  "applied",
  "fee_paid",
  "admit_card_released",
  "exam_completed",
  "result_awaited",
  "selected",
  "not_selected",
  "withdrawn"
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const applicationInputSchema = z.object({
  postId: z.string().min(1),
  status: z.enum(applicationStatuses),
  applicationNumber: z.string().trim().max(80).optional(),
  appliedAt: z.string().date().optional(),
  notes: z.string().trim().max(1200).optional(),
  nextActionDate: z.string().date().optional()
});

export type ApplicationInput = z.infer<typeof applicationInputSchema>;

export function nextActionUrgency(nextActionDate?: string, today = new Date()) {
  if (!nextActionDate) return "none";
  const date = parseISO(nextActionDate);
  if (isBefore(date, today)) return "overdue";
  if (isBefore(date, addDays(today, 3))) return "soon";
  return "scheduled";
}

export function statusLabel(status: ApplicationStatus) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
