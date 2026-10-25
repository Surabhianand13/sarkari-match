"use server";

import { adminDb } from "@/lib/admin/db";
import { importRecruitmentRows } from "@/lib/admin/csv-import";
import { checkbox } from "@/lib/admin/forms";
import { goTo, withMessage } from "@/lib/admin/nav";
import { requireAdmin } from "@/lib/auth/guards";
import { parseRecruitmentCsv } from "@/lib/import/csv";

const BASE = "/admin/import";

export async function importCsv(formData: FormData) {
  const admin = await requireAdmin();
  const file = formData.get("csv");
  if (!(file instanceof File) || file.size === 0) goTo(withMessage(BASE, "error", "Choose a CSV file."));
  if ((file as File).size > 1_000_000) goTo(withMessage(BASE, "error", "The file is larger than 1 MB."));
  const parsed = parseRecruitmentCsv(await (file as File).text());
  const preview = parsed.errors.slice(0, 3).map((error) => `row ${error.row}: ${error.message}`).join("; ");

  if (checkbox(formData, "dry_run")) {
    goTo(withMessage(BASE, parsed.errors.length ? "error" : "notice", `Check only: ${parsed.validRows.length} valid rows, ${parsed.errors.length} with errors.${preview ? ` ${preview}` : ""}`));
  }
  const db = await adminDb();
  const result = await importRecruitmentRows(db, parsed.validRows, admin.id);
  const skipped = result.skipped.slice(0, 3).map((item) => `row ${item.row}: ${item.reason}`).join("; ");
  const problems = parsed.errors.length + result.skipped.length;
  goTo(withMessage(BASE, problems ? "error" : "notice", `${result.created} drafts created, ${problems} rows skipped.${preview ? ` ${preview}` : ""}${skipped ? ` ${skipped}` : ""} Review them under Recruitments before publishing.`));
}
