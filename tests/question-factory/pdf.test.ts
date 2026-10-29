import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/lib/question-factory/knowledge";

// A one-page PDF with a real text layer, built by hand so the test needs no fixture file.
function pdfWithText(line: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${`BT /F1 14 Tf 72 700 Td (${line}) Tj ET`.length} >>\nstream\nBT /F1 14 Tf 72 700 Td (${line}) Tj ET\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

describe("syllabus PDF text extraction", () => {
  it("reads the text layer of an uploaded PDF", async () => {
    const text = await extractPdfText(pdfWithText("Quantitative Aptitude covers percentage and ratio"));
    expect(text).toContain("Quantitative Aptitude covers percentage and ratio");
  });
});
