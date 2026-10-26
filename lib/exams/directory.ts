// Exam families shown in the navigation and on the home page. An exam only links through once its series exists;
// everything else is listed as coming soon so the catalogue can grow without redesigning the menu.
export type ExamFamily = {
  name: string;
  exams: ReadonlyArray<{ name: string; href: string }>;
  comingSoon?: boolean;
};

export const examFamilies: readonly ExamFamily[] = [
  { name: "SSC Exams", exams: [{ name: "SSC CGL", href: "/tests/ssc-cgl" }] },
  { name: "Railway Exams", exams: [], comingSoon: true },
  { name: "Teaching Exams", exams: [], comingSoon: true },
  { name: "Civil Services Exams", exams: [], comingSoon: true },
  { name: "Banking Exams", exams: [], comingSoon: true }
];
