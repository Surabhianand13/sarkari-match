import { describe, expect, it } from "vitest";
import { toJobPost, type JobPostRow } from "@/lib/data/jobs";

const row: JobPostRow = {
  id: "1", slug: "s", title: "T", description: null, vacancy_count: null, vacancy_total: null, salary_text: null, application_status: "open",
  published_at: null, eligibility_rules: { qualificationRules: [{ minimumLevel: "iti", mandatory: true, ruleText: "x" }] },
  recruitment_title: null, application_start_date: null, application_end_date: "2026-08-15", official_notification_url: null, official_application_url: null,
  verified_at: null, organisation_name: null, department_name: null, state_name: null
};

describe("toJobPost", () => {
  it("fills safe defaults for missing joined columns", () => {
    const job = toJobPost(row);
    expect(job).toMatchObject({ organisation: "Unknown organisation", department: "General", state: "Central Government", vacancyCount: 0, officialApplicationUrl: "#", qualification: "ITI" });
    expect(job.recruitmentTitle).toBe("T");
  });

  it("shows the notification's total, marked as shared, for a post with no count of its own", () => {
    expect(toJobPost({ ...row, vacancy_total: 102 })).toMatchObject({ vacancyCount: 102, vacancyShared: true });
    expect(toJobPost({ ...row, vacancy_count: 40, vacancy_total: 102 })).toMatchObject({ vacancyCount: 40, vacancyShared: false });
    expect(toJobPost(row)).toMatchObject({ vacancyCount: 0, vacancyShared: false });
  });
});
