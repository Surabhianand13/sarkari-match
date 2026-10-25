import { normalizeText } from "@/lib/tests/question-schema";

function shingles(text: string, size = 3) {
  const words = normalizeText(text).split(" ").filter(Boolean);
  if (words.length <= size) return new Set([words.join(" ")]);
  const set = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) set.add(words.slice(i, i + size).join(" "));
  return set;
}

export function similarity(a: string, b: string) {
  const left = shingles(a);
  const right = shingles(b);
  let shared = 0;
  for (const item of left) if (right.has(item)) shared++;
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : shared / union;
}

// Returns the closest existing stem when it is similar enough to count as a near copy.
export function findNearDuplicate(stem: string, existing: readonly string[], threshold = 0.8) {
  let best: { stem: string; score: number } | null = null;
  for (const candidate of existing) {
    const score = similarity(stem, candidate);
    if (score >= threshold && (!best || score > best.score)) best = { stem: candidate, score };
  }
  return best;
}
