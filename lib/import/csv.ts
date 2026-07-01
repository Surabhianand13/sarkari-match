import { z } from "zod";

export const recruitmentCsvRowSchema = z.object({
  organisation: z.string().trim().min(1),
  recruitment_title: z.string().trim().min(1),
  post_title: z.string().trim().min(1),
  qualification: z.string().trim().min(1),
  state: z.string().trim().min(1),
  application_end_date: z.string().date(),
  official_notification_url: z.string().url(),
  official_application_url: z.string().url(),
  vacancy_count: z.coerce.number().int().nonnegative().optional()
});

export type CsvValidationResult = {
  validRows: Array<z.infer<typeof recruitmentCsvRowSchema>>;
  errors: Array<{ row: number; message: string }>;
};

export const recruitmentCsvTemplate = [
  "organisation",
  "recruitment_title",
  "post_title",
  "qualification",
  "state",
  "application_end_date",
  "official_notification_url",
  "official_application_url",
  "vacancy_count"
].join(",");

export function parseRecruitmentCsv(text: string): CsvValidationResult {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  const validRows: CsvValidationResult["validRows"] = [];
  const errors: CsvValidationResult["errors"] = [];

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex] ?? ""]));
    const parsed = recruitmentCsvRowSchema.safeParse(row);
    if (parsed.success) validRows.push(parsed.data);
    else errors.push({ row: index + 2, message: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ") });
  });

  return { validRows, errors };
}

function splitCsvLine(line: string) {
  return line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
}
