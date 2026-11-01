// The headings a set's questions are shown under. Kept apart from lib/question-sets.ts, which carries the validation library, so
// learners' pages do not download it.

export type SetContentKind = "data" | "passage" | "cloze";

export const setLabelsHi: Record<SetContentKind, string> = {
  data: "इस प्रश्न के लिए आँकड़े",
  passage: "गद्यांश पढ़ें",
  cloze: "गद्यांश पढ़ें और रिक्त स्थान भरें"
};

export const setLabels: Record<SetContentKind, { label: string; context: string; noun: string }> = {
  data: { label: "Data for this question", context: "Data set", noun: "data" },
  passage: { label: "Read the passage", context: "Passage", noun: "passage" },
  cloze: { label: "Read the passage and fill in the blanks", context: "Cloze passage", noun: "passage" }
};
