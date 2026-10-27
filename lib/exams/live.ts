import { examFamilies, type ExamFamily, type ExamFamilyIcon } from "@/lib/exams/directory";
import { getLiveExams } from "@/lib/tests/catalog";

const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

// Which family an exam belongs to, from its slug. Unknown exams go under "State Govt." so they still appear once published.
const prefixes: Array<[string, ExamFamilyIcon]> = [
  ["ssc", "ssc"], ["rrb", "railway"], ["rrc", "railway"], ["rpf", "railway"], ["railway", "railway"], ["ctet", "teaching"], ["tet", "teaching"], ["kvs", "teaching"], ["nvs", "teaching"],
  ["upsc", "civil"], ["ias", "civil"], ["ibps", "banking"], ["sbi", "banking"], ["rbi", "banking"], ["nda", "defence"], ["cds", "defence"], ["afcat", "defence"], ["police", "police"]
];

export function familyIconForSlug(slug: string): ExamFamilyIcon {
  const found = prefixes.find(([prefix]) => slug.startsWith(prefix));
  return found ? found[1] : "state";
}

// The menu, home page and test-series page list only exams that have a published series. Everything else in the directory is "coming soon".
export async function getExamFamilies(): Promise<ExamFamily[]> {
  const liveExams = new Map<string, { name: string; slug: string }>();
  for (const exam of await getLiveExams()) liveExams.set(exam.slug, exam);
  const liveNames = new Set([...liveExams.values()].map((exam) => norm(exam.name)));

  return examFamilies.map((family) => {
    const exams = [...liveExams.values()].filter((exam) => familyIconForSlug(exam.slug) === family.icon).map((exam) => ({ name: exam.name, href: `/tests/${exam.slug}` }));
    const upcoming = [...family.exams.map((exam) => exam.name), ...family.upcoming].filter((name) => !liveNames.has(norm(name)));
    return { ...family, exams, upcoming, comingSoon: exams.length === 0 };
  });
}
