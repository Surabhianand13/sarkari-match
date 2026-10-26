import { z } from "zod";
import { getDb } from "@/lib/db";
import { examPattern as builtInPattern } from "@/lib/exams/ssc-cgl";

export const patternSchema = z.object({
  name: z.string().trim().min(1).max(120),
  questions: z.number().int().positive().max(1000),
  maxMarks: z.number().positive().max(10000),
  minutes: z.number().int().positive().max(1000),
  marksPerQuestion: z.number().positive().max(100),
  negativeMarks: z.number().min(0).max(100),
  sections: z.array(z.object({ name: z.string().trim().min(1).max(120), questions: z.number().int().positive().max(1000), marks: z.number().positive().max(10000) })).min(1).max(20)
});

export type ExamPattern = z.infer<typeof patternSchema>;

// Each exam keeps its own pattern in the database (set in Admin > Exams). SSC CGL falls back to the built-in one until it is saved.
export async function getExamPattern(examSlug: string): Promise<ExamPattern | null> {
  const db = await getDb();
  if (db) {
    const row = (await db.query<{ pattern: unknown }>("select pattern from exams where slug = $1", [examSlug])).rows[0];
    const parsed = patternSchema.safeParse(row?.pattern);
    if (parsed.success) return parsed.data;
  }
  const builtIn = builtInPattern(examSlug);
  return builtIn ? { ...builtIn, sections: builtIn.sections.map((section) => ({ ...section })) } : null;
}
