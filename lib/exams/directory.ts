// Exam families shown in the navigation, the test series page and the home page.
// `exams` are live (they link to a test series page). `upcoming` names are shown as "coming soon" and never link anywhere,
// so the catalogue can grow without redesigning the menu. Move a name from `upcoming` to `exams` when its series goes live.
export type ExamFamilyIcon = "ssc" | "railway" | "teaching" | "civil" | "banking" | "defence" | "police" | "state" | "engineering";

export type ExamFamily = {
  slug: string;
  name: string;
  icon: ExamFamilyIcon;
  exams: ReadonlyArray<{ name: string; href: string }>;
  upcoming: readonly string[];
  comingSoon: boolean;
};

function family(slug: string, name: string, icon: ExamFamilyIcon, exams: ExamFamily["exams"], upcoming: readonly string[]): ExamFamily {
  return { slug, name, icon, exams, upcoming, comingSoon: exams.length === 0 };
}

export const examFamilies: readonly ExamFamily[] = [
  family("ssc", "SSC Exams", "ssc", [{ name: "SSC CGL", href: "/tests/ssc-cgl" }], ["SSC CHSL", "SSC MTS", "SSC GD Constable", "SSC CPO", "SSC JE", "SSC Stenographer", "SSC Selection Post"]),
  family("railway", "Railway Exams", "railway", [], ["RRB NTPC", "RRB Group D", "RRB ALP", "RRB JE", "RPF Constable", "RPF SI"]),
  family("teaching", "Teaching Exams", "teaching", [], ["CTET", "KVS", "NVS", "State TET", "REET"]),
  family("civil", "Civil Services Exams", "civil", [], ["UPSC CSE", "State PSC"]),
  family("banking", "Banking Exams", "banking", [], ["SBI PO", "SBI Clerk", "IBPS PO", "IBPS Clerk", "RBI Assistant", "IBPS RRB"]),
  family("defence", "Defence Exams", "defence", [], ["NDA", "CDS", "AFCAT", "Agniveer"]),
  family("police", "Police Exams", "police", [], ["Delhi Police Constable", "UP Police Constable", "State Police SI"]),
  family("state", "State Govt. Exams", "state", [], ["State SSC exams", "State subordinate services"]),
  family("engineering", "Engineering Recruitment", "engineering", [], ["SSC JE", "RRB JE", "State JE exams"])
];
