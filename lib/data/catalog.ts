export type JobPost = {
  id: string;
  slug: string;
  title: string;
  recruitmentTitle: string;
  organisation: string;
  department: string;
  state: string;
  qualification: string;
  vacancyCount: number;
  salaryText: string;
  applicationEndDate: string;
  applicationStatus: "open" | "closed" | "upcoming";
  publishedAt: string;
  verifiedAt: string;
  officialApplicationUrl: string;
  officialNotificationUrl: string;
  description: string;
};

export const qualificationPages = [
  "8th-pass",
  "10th-pass",
  "12th-pass",
  "iti",
  "diploma",
  "graduate",
  "btech",
  "postgraduate",
  "nursing",
  "teaching",
  "law"
];

export const states = [
  "central-government",
  "andhra-pradesh",
  "arunachal-pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal-pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya-pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil-nadu",
  "telangana",
  "tripura",
  "uttar-pradesh",
  "uttarakhand",
  "west-bengal"
];
export const departments = ["ssc", "upsc", "railways", "banking", "defence", "police", "teaching", "engineering", "healthcare", "psu"];

export const qualificationLabels: Record<string, string> = {
  "8th-pass": "8th Pass",
  "10th-pass": "10th Pass",
  "12th-pass": "12th Pass",
  iti: "ITI",
  diploma: "Diploma",
  graduate: "Graduate",
  btech: "B.Tech/B.E",
  postgraduate: "Post Graduates",
  nursing: "Nursing",
  teaching: "Teaching",
  law: "Law"
};

export const departmentLabels: Record<string, string> = {
  ssc: "SSC",
  upsc: "UPSC",
  railways: "Railways",
  banking: "Banking",
  defence: "Defence",
  police: "Police",
  teaching: "Teaching",
  engineering: "Engineering",
  healthcare: "Healthcare",
  psu: "PSU"
};

export const stateLabels: Record<string, string> = {
  "central-government": "Central Government",
  "andhra-pradesh": "Andhra Pradesh",
  "arunachal-pradesh": "Arunachal Pradesh",
  assam: "Assam",
  bihar: "Bihar",
  chhattisgarh: "Chhattisgarh",
  goa: "Goa",
  gujarat: "Gujarat",
  haryana: "Haryana",
  "himachal-pradesh": "Himachal Pradesh",
  jharkhand: "Jharkhand",
  karnataka: "Karnataka",
  kerala: "Kerala",
  "madhya-pradesh": "Madhya Pradesh",
  maharashtra: "Maharashtra",
  manipur: "Manipur",
  meghalaya: "Meghalaya",
  mizoram: "Mizoram",
  nagaland: "Nagaland",
  odisha: "Odisha",
  punjab: "Punjab",
  rajasthan: "Rajasthan",
  sikkim: "Sikkim",
  "tamil-nadu": "Tamil Nadu",
  telangana: "Telangana",
  tripura: "Tripura",
  "uttar-pradesh": "Uttar Pradesh",
  uttarakhand: "Uttarakhand",
  "west-bengal": "West Bengal"
};

export const demoJobs: JobPost[] = [
  {
    id: "demo-ssc-assistant",
    slug: "demo-ssc-assistant-2026",
    title: "Demo SSC Assistant Officer 2026",
    recruitmentTitle: "Demo SSC Combined Recruitment 2026",
    organisation: "Demo Staff Selection Board",
    department: "SSC",
    state: "Central Government",
    qualification: "Graduate",
    vacancyCount: 120,
    salaryText: "Level 6, as per official notification",
    applicationEndDate: "2026-08-15",
    applicationStatus: "open",
    publishedAt: "2026-06-20",
    verifiedAt: "2026-06-20",
    officialApplicationUrl: "https://example.com/apply",
    officialNotificationUrl: "https://example.com/notification.pdf",
    description: "Development-only demo listing for validating SarkariMatch workflows. Replace with verified official data before production launch."
  },
  {
    id: "demo-railway-technician",
    slug: "demo-railway-technician-2026",
    title: "Demo Railway Technician 2026",
    recruitmentTitle: "Demo Railway Technical Posts 2026",
    organisation: "Demo Railway Recruitment Cell",
    department: "Railways",
    state: "Karnataka",
    qualification: "ITI",
    vacancyCount: 80,
    salaryText: "Pay matrix level 2",
    applicationEndDate: "2026-07-20",
    applicationStatus: "open",
    publishedAt: "2026-06-18",
    verifiedAt: "2026-06-19",
    officialApplicationUrl: "https://example.com/railway-apply",
    officialNotificationUrl: "https://example.com/railway-notification.pdf",
    description: "Development-only demo listing for validating filters, expiry behavior and detail pages."
  }
];

export function getJobBySlug(slug: string) {
  return demoJobs.find((job) => job.slug === slug);
}
