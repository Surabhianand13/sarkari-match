import { describe, expect, it } from "vitest";
import { parseRecruitmentCsv, recruitmentCsvTemplate } from "@/lib/import/csv";

describe("csv import", () => {
  it("validates rows and reports row errors", () => {
    const result = parseRecruitmentCsv(`${recruitmentCsvTemplate}
Demo Org,Demo Recruitment,Demo Post,Graduate,Karnataka,2026-08-15,https://example.com/notice.pdf,https://example.com/apply,10
Demo Org,Demo Recruitment,Missing Date,Graduate,Karnataka,not-a-date,https://example.com/notice.pdf,https://example.com/apply,10`);
    expect(result.validRows).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });
});
