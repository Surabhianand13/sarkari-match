// The listing pages one-click sync reads. Each is a page of links to notifications; the dashboard decides which are new or changed.
export const SITE_ORIGINS = ["https://www.freejobalert.com/*", "https://www.adda247.com/*"];

const FJA = "https://www.freejobalert.com";

// Every day: the pages where new and updated notifications show first.
export const CHECK_LISTINGS = [`${FJA}/latest-notifications/`, `${FJA}/`, "https://www.adda247.com/jobs/latest-post/", "https://www.adda247.com/jobs/"];

// Once, for the archive: the category and state pages keep notifications that have dropped off the latest list.
const FJA_PAGES = [
  "government-jobs", "bank-jobs", "railway-jobs", "psu-jobs", "police-defence-jobs", "teaching-faculty-jobs", "engineering-jobs", "psc-jobs", "law-jobs",
  "anganwadi-recruitment", "forest-department-jobs", "female-government-jobs", "government-jobs-without-exams", "state-government-jobs",
  "ap-government-jobs", "assam-government-jobs", "bihar-government-jobs", "chhattisgarh-government-jobs", "delhi-government-jobs", "gujarat-government-jobs",
  "haryana-government-jobs", "hp-government-jobs", "jharkhand-government-jobs", "karnataka-government-jobs", "kerala-government-jobs", "maharashtra-government-jobs",
  "mp-government-jobs", "odisha-government-jobs", "punjab-government-jobs", "rajasthan-government-jobs", "telangana-government-jobs", "tn-government-jobs",
  "up-government-jobs", "uttarakhand-government-jobs", "wb-government-jobs",
  "search-jobs/10th-pass-government-jobs", "search-jobs/12th-pass-government-jobs", "search-jobs/8th-pass-government-jobs", "search-jobs/any-graduate-government-jobs",
  "search-jobs/any-post-graduate-government-jobs", "search-jobs/btech-be-government-jobs", "search-jobs/diploma-government-jobs", "search-jobs/iti-government-jobs"
];
export const BACKFILL_LISTINGS = [...CHECK_LISTINGS, ...FJA_PAGES.map((page) => `${FJA}/${page}/`)];

// How far back a run goes. A listing row older than this is skipped; a row with no date is always read.
export const WINDOWS = [
  { key: "30", label: "the last 30 days", days: 30 },
  { key: "90", label: "the last 3 months", days: 90 },
  { key: "183", label: "the last 6 months", days: 183 },
  { key: "365", label: "the last year", days: 365 },
  { key: "any", label: "any date", days: 0 }
];

export function sinceDate(days) {
  if (!days) return undefined;
  const date = new Date(Date.now() + 5.5 * 3600 * 1000 - days * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}
