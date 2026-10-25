export const brand = {
  name: "Sarkari Match",
  byline: "by PW",
  fullName: "Sarkari Match by PW",
  tagline: "Govt job and exam notifications matched to your eligibility, plus affordable mock tests.",
  shortDescription:
    "Sarkari Match by PW matches govt job and exam notifications to your age, qualification and category, and offers low-priced mock tests for SSC, banking, railway and other exams.",
  locale: "en_IN"
} as const;

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarkarimatch.com").replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
