export const brand = {
  name: "Sarkari Match",
  fullName: "Sarkari Match",
  tagline: "Affordable SSC CGL mock test series, plus govt job notifications matched to your eligibility.",
  shortDescription:
    "Sarkari Match offers affordable SSC CGL mock test series written by experts and checked by AI, with solutions and analysis, plus govt job notifications matched to your eligibility.",
  locale: "en_IN"
} as const;

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sarkarimatch.com").replace(/\/$/, "");
}

export function absoluteUrl(path = "/") {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
