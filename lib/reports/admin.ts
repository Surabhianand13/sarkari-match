import type { JobPost } from "@/lib/data/catalog";

export type AdminReportSummary = {
  activeJobs: number;
  closingInSevenDays: number;
  reportedErrors: number;
  savedJobs: number;
  trackedApplications: number;
};

export function summarizeAdminReports({ jobs, reportedErrors = 0, savedJobs = 0, trackedApplications = 0, today = new Date() }: { jobs: JobPost[]; reportedErrors?: number; savedJobs?: number; trackedApplications?: number; today?: Date }): AdminReportSummary {
  const sevenDays = today.getTime() + 7 * 24 * 60 * 60 * 1000;
  return {
    activeJobs: jobs.filter((job) => job.applicationStatus === "open").length,
    closingInSevenDays: jobs.filter((job) => {
      const end = new Date(job.applicationEndDate).getTime();
      return job.applicationStatus === "open" && end >= today.getTime() && end <= sevenDays;
    }).length,
    reportedErrors,
    savedJobs,
    trackedApplications
  };
}
