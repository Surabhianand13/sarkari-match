import { sniffImageType } from "@/lib/banners";

// A picture a person attaches to a question (a diagram that cannot be drawn from a description). It is stored in the
// database like banners are, so it stays small, and it always needs a written description for screen readers and the checking AI.

export type QuestionImage = { id: string; alt: string };

export const MAX_QUESTION_IMAGE_BYTES = 700 * 1024;
export const MIN_ALT_CHARS = 10;
export const MAX_ALT_CHARS = 300;

export function checkQuestionImage(bytes: Uint8Array, alt: string): { type: "image/png" | "image/jpeg" | "image/webp"; alt: string } | { error: string } {
  if (bytes.length > MAX_QUESTION_IMAGE_BYTES) return { error: `The image is over ${Math.round(MAX_QUESTION_IMAGE_BYTES / 1024)} KB. Compress it or shrink it to about 800 pixels wide and upload again.` };
  const type = sniffImageType(bytes);
  if (!type) return { error: "The image must be a PNG, JPG or WebP file." };
  const description = alt.trim();
  if (description.length < MIN_ALT_CHARS) return { error: `Describe what the image shows in at least ${MIN_ALT_CHARS} characters. Screen readers and the checking AI depend on it.` };
  if (description.length > MAX_ALT_CHARS) return { error: `Keep the description under ${MAX_ALT_CHARS} characters.` };
  return { type, alt: description };
}
