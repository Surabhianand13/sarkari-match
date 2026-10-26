// Everything the site says about who writes and checks the tests, and the proof shown to learners.
// These statements are made by the business: keep them true and be ready to show evidence for them.
// Add real reviews and expert profiles below; empty lists simply hide those sections.

export type Review = { name: string; city?: string; exam?: string; text: string; result?: string };
export type Expert = { name: string; role: string; experience: string; bio?: string };

export const trust = {
  headline: "Written by experts. Checked by AI. Reviewed before it goes live.",
  claims: [
    "Questions written by subject experts with 15+ years of experience",
    "AI-checked for difficulty level and exam relevance",
    "Every question reviewed by a person before it is published"
  ],
  process: [
    { title: "Written by experts", body: "Each question is written by subject experts with 15+ years of experience teaching for government exams, following the latest exam pattern and syllabus." },
    { title: "Checked by AI", body: "Questions are independently solved and checked by AI for the right difficulty, exam relevance, a single correct answer and sound solutions." },
    { title: "Reviewed by a person", body: "A reviewer approves every question before it reaches a test. Nothing is published automatically." }
  ],
  // Numbers supplied by the business. Update them as they change.
  stats: [
    { value: "10,000+", label: "learners trained, from cities across India" },
    { value: "1 lakh+", label: "learners use our platform every month" }
  ],
  // Reviews collected offline. Add them here exactly as given (name, city, what they said).
  reviews: [] as Review[],
  experts: [] as Expert[]
};

export function hasReviews() {
  return trust.reviews.length > 0;
}
