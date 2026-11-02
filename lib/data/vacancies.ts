import type { JobPost } from "@/lib/data/catalog";

type VacancyFields = Pick<JobPost, "vacancyCount" | "vacancyShared">;

export const sharedVacancyNote = "* Combined total for all posts in this notification. The notification does not split it by post.";

// "120", "102*" when the number is the whole notification's total, or words when the notification gave no number at all.
export function vacancyFigure(job: VacancyFields) {
  if (!job.vacancyCount) return "As per notification";
  return `${job.vacancyCount.toLocaleString("en-IN")}${job.vacancyShared ? "*" : ""}`;
}

// For sentences and pills: "120 vacancies", "102* vacancies", "Vacancies as per notification".
export function vacancyPhrase(job: VacancyFields) {
  return job.vacancyCount ? `${vacancyFigure(job)} vacancies` : "Vacancies as per notification";
}

// Plain text for page descriptions and feeds, where an asterisk would read oddly: "102 vacancies in total".
export function vacancyPlain(job: VacancyFields) {
  if (!job.vacancyCount) return "vacancies as per notification";
  return `${job.vacancyCount.toLocaleString("en-IN")} vacancies${job.vacancyShared ? " in total" : ""}`;
}
