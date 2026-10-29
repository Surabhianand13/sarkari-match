import type { Db } from "@/lib/db";
import { normalizeText } from "@/lib/tests/question-schema";

// Reference material the factory writes against and checks against: the official syllabus, current affairs for the
// exam window, and past papers. Past papers set the style and level and catch near copies; they are never reprinted.

export const sourceKinds = ["syllabus", "current_affairs", "pyq", "reference"] as const;
export type SourceKind = (typeof sourceKinds)[number];

export const sourceKindLabels: Record<SourceKind, string> = {
  syllabus: "Syllabus",
  current_affairs: "Current affairs",
  pyq: "Previous year questions",
  reference: "Reference notes"
};

export function examSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export type KnowledgeSourceRow = {
  id: string;
  exam_slug: string;
  subject: string | null;
  topic: string | null;
  kind: SourceKind;
  title: string;
  characters: number;
  file_name: string | null;
  as_of: string | null;
  created_at: string;
};

export async function addSource(
  db: Db,
  input: { exam: string; subject?: string | null; topic?: string | null; kind: SourceKind; title: string; body: string; fileName?: string | null; asOf?: string | null; createdBy?: string | null }
) {
  const body = input.body.replace(/\r\n/g, "\n").trim();
  if (body.length < 40) throw new Error("There is not enough text in that source. If it is a scanned PDF, paste the text instead.");
  const result = await db.query<{ id: string }>(
    `insert into knowledge_sources (exam_slug, subject, topic, kind, title, body, file_name, as_of, created_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
    [examSlug(input.exam), input.subject?.trim() || null, input.topic?.trim() || null, input.kind, input.title.trim(), body, input.fileName ?? null, input.asOf || null, input.createdBy ?? null]
  );
  return result.rows[0].id;
}

export async function listSources(db: Db) {
  const result = await db.query<KnowledgeSourceRow>(
    `select id, exam_slug, subject, topic, kind, title, length(body)::int as characters, file_name, as_of::text, created_at::text
     from knowledge_sources order by exam_slug, kind, subject nulls first, created_at desc`
  );
  return result.rows;
}

export async function deleteSource(db: Db, id: string) {
  await db.query("delete from knowledge_sources where id = $1", [id]);
}

// Past-paper text is stored as one block. Split it into individual questions so near copies can be caught.
export function pyqStems(body: string): string[] {
  return body
    .split(/\n\s*\n|\n(?=\s*(?:Q\.?\s*)?\d{1,4}\s*[.)]\s)/i)
    .map((part) => part.replace(/^\s*(?:Q\.?\s*)?\d{1,4}\s*[.)]\s*/i, "").replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 25);
}

// True when every meaningful word of the topic appears in the syllabus text. Null means there is no syllabus to compare with.
export function topicInSyllabus(syllabus: string, topic: string): boolean | null {
  if (!syllabus.trim()) return null;
  const haystack = normalizeText(syllabus);
  const words = normalizeText(topic).split(" ").filter((word) => word.length > 3);
  if (!words.length) return true;
  return words.every((word) => haystack.includes(word.replace(/s$/, "")));
}

export type Knowledge = {
  hasSyllabus: boolean;
  syllabus: string;
  currentAffairs: string;
  currentAffairsStale: boolean;
  pyqs: string[];
  pyqSamples: string[];
  sourceTitles: string[];
};

const SYLLABUS_LIMIT = 12000;
const CURRENT_AFFAIRS_LIMIT = 6000;
const PYQ_STEM_LIMIT = 800;

type SourceBody = { kind: SourceKind; title: string; body: string; as_of: string | null; topic: string | null };

export async function knowledgeFor(db: Db, input: { exam: string; subject: string; topic?: string | null }): Promise<Knowledge> {
  const rows = await db.query<SourceBody>(
    `select kind, title, body, as_of::text, topic from knowledge_sources
     where exam_slug = $1 and (subject is null or lower(subject) = lower($2)) order by as_of desc nulls last, created_at desc`,
    [examSlug(input.exam), input.subject]
  );
  const topic = input.topic?.trim().toLowerCase();
  const relevant = rows.rows.filter((row) => !row.topic || !topic || row.topic.toLowerCase() === topic);
  const ofKind = (kind: SourceKind) => relevant.filter((row) => row.kind === kind);

  const syllabus = ofKind("syllabus").map((row) => row.body).join("\n\n").slice(0, SYLLABUS_LIMIT);
  const currentAffairsRows = ofKind("current_affairs");
  const currentAffairs = currentAffairsRows.map((row) => row.body).join("\n\n").slice(0, CURRENT_AFFAIRS_LIMIT);
  const newest = currentAffairsRows.find((row) => row.as_of)?.as_of;
  const currentAffairsStale = currentAffairsRows.length > 0 && (!newest || Date.now() - new Date(newest).getTime() > 365 * 24 * 3600 * 1000);
  const pyqs = ofKind("pyq").flatMap((row) => pyqStems(row.body)).slice(0, PYQ_STEM_LIMIT);

  const keyword = topic?.split(" ")[0];
  const matching = keyword ? pyqs.filter((stem) => stem.toLowerCase().includes(keyword)) : [];
  const pyqSamples = (matching.length >= 3 ? matching : pyqs).slice(0, 5).map((stem) => stem.slice(0, 400));

  return { hasSyllabus: syllabus.length > 0, syllabus, currentAffairs, currentAffairsStale, pyqs, pyqSamples, sourceTitles: relevant.map((row) => `${sourceKindLabels[row.kind]}: ${row.title}`) };
}

// Text from a PDF upload. Scanned (image only) PDFs have no text layer; the caller reports that to the admin.
export async function extractPdfText(data: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n\n") : text).replace(/[ \t]+\n/g, "\n").trim();
}
