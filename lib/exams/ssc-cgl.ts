// Official SSC CGL Tier I pattern. Check the latest SSC notification for changes before each exam cycle.
export const sscCglTier1 = {
  name: "SSC CGL Tier I",
  questions: 100,
  maxMarks: 200,
  minutes: 60,
  marksPerQuestion: 2,
  negativeMarks: 0.5,
  sections: [
    { name: "General Intelligence and Reasoning", questions: 25, marks: 50 },
    { name: "General Awareness", questions: 25, marks: 50 },
    { name: "Quantitative Aptitude", questions: 25, marks: 50 },
    { name: "English Comprehension", questions: 25, marks: 50 }
  ]
} as const;

export function examPattern(examSlug: string) {
  return examSlug === "ssc-cgl" ? sscCglTier1 : null;
}
