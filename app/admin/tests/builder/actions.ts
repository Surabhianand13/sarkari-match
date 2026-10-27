"use server";

import { z } from "zod";
import { writeAudit } from "@/lib/admin/audit";
import { goTo } from "@/lib/admin/nav";
import { revalidatePublicContent } from "@/lib/admin/revalidate";
import { requireAdmin } from "@/lib/auth/guards";
import { LEVELS, buildTests, defaultPrefix, publishDrafts, type BuildInput } from "@/lib/tests/builder";

const BASE = "/admin/tests/builder";

const schema = z.object({
  series_id: z.string().uuid(),
  kind: z.enum(["full", "sectional", "topic"]),
  level: z.enum(LEVELS),
  count: z.coerce.number().int().min(1).max(100),
  title_prefix: z.string().trim().max(80),
  duration: z.coerce.number().int().min(1).max(300),
  marks: z.coerce.number().min(0.25).max(100),
  negative: z.coerce.number().min(0).max(100),
  max_reuse: z.coerce.number().int().min(1).max(20),
  status: z.enum(["draft", "published"]),
  sections: z.string().trim().min(3).max(4000)
});

// One section per line: Name | subject | questions | topic (topic is optional).
function parseSections(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [name, subject, questions, topic] = line.split("|").map((part) => part.trim());
    return { name, subject, questions: Number(questions), topic: topic || null };
  });
}

const encode = (data: unknown) => Buffer.from(JSON.stringify(data)).toString("base64url");

export async function runBuilder(formData: FormData) {
  const admin = await requireAdmin();
  const intent = formData.get("intent") === "create" ? "create" : "preview";
  const raw = Object.fromEntries([...formData.entries()].filter(([key]) => !key.startsWith("$")));
  const parsed = schema.safeParse(raw);
  const form = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, String(value)]));
  if (!parsed.success) goTo(`${BASE}?r=${encode({ form, error: `Check the form: ${parsed.error.issues[0]?.path.join(".")} is not valid.` })}`);
  const data = parsed.data!;
  const sections = parseSections(data.sections);
  if (!sections.length || sections.some((section) => !section.name || !section.subject || !Number.isInteger(section.questions) || section.questions < 1 || section.questions > 100)) {
    goTo(`${BASE}?r=${encode({ form, error: "Sections go one per line as: Name | subject | number of questions | topic (topic optional). Subject must match a subject in the question bank." })}`);
  }
  const input: BuildInput = {
    seriesId: data.series_id, kind: data.kind, level: data.level, count: data.count, titlePrefix: data.title_prefix, durationMinutes: data.duration,
    defaultMarks: data.marks, negativeMarks: data.negative, sections, maxReuse: data.max_reuse, status: data.status
  };
  let report;
  try {
    report = await buildTests(input, { dryRun: intent === "preview" });
  } catch (error) {
    goTo(`${BASE}?r=${encode({ form, error: error instanceof Error ? error.message : "Could not build the tests." })}`);
  }
  if (intent === "create" && report!.created > 0) {
    const { adminDb } = await import("@/lib/admin/db");
    await writeAudit(await adminDb(), { actorId: admin.id, action: "tests.build", entityType: "test_series", entityId: data.series_id, after: { kind: data.kind, level: data.level, created: report!.created } });
    revalidatePublicContent();
  }
  goTo(`${BASE}?r=${encode({ form, intent, report: { ...report!, shortages: report!.shortages.slice(0, 8) }, prefix: data.title_prefix || defaultPrefix(input) })}`);
}

const publishSchema = z.object({ series_id: z.string().uuid(), kind: z.enum(["any", "full", "sectional", "topic"]), level: z.enum(["any", ...LEVELS]) });

export async function publishBuilt(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = publishSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) goTo(`${BASE}?r=${encode({ error: "Choose a series to publish." })}`);
  const { series_id, kind, level } = parsed.data!;
  const count = await publishDrafts({ seriesId: series_id, kind: kind === "any" ? null : kind, level: level === "any" ? null : level });
  const { adminDb } = await import("@/lib/admin/db");
  await writeAudit(await adminDb(), { actorId: admin.id, action: "tests.publish_bulk", entityType: "test_series", entityId: series_id, after: { kind, level, published: count } });
  revalidatePublicContent();
  goTo(`${BASE}?r=${encode({ published: count })}`);
}
