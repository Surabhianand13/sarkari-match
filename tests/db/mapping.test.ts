import { describe, expect, it } from "vitest";
import { toJobPost, type JobPostRow } from "@/lib/data/jobs";

const row: JobPostRow = {
  id: "1", slug: "s", title: "T", description: null, vacancy_count: null, salary_text: null, application_status: "open",
  published_at: null, eligibility_rules: { qualificationRules: [{ minimumLevel: "iti", mandatory: true, ruleText: "x" }] },
  recruitment_title: null, application_end_date: "2026-08-15", official_notification_url: null, official_application_url: null,
  verified_at: null, organisation_name: null, department_name: null, state_name: null
};

describe("toJobPost", () => {
  it("fills safe defaults for missing joined columns", () => {
    const job = toJobPost(row);
    expect(job).toMatchObject({ organisation: "Unknown organisation", department: "General", state: "Central Government", vacancyCount: 0, officialApplicationUrl: "#", qualification: "ITI" });
    expect(job.recruitmentTitle).toBe("T");
  });
});
