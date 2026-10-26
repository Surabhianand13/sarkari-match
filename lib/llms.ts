import { absoluteUrl, brand } from "@/lib/brand";
import { jobsForDepartment, jobsForQualification, jobsForState } from "@/lib/data/hubs";
import { departmentLabels, departments, qualificationLabels, qualificationPages, stateLabels, states } from "@/lib/data/catalog";
import { getJobs } from "@/lib/data/jobs";
import { getPublishedSeries, formatPrice } from "@/lib/tests/catalog";

export async function buildLlmsText(full: boolean) {
  const jobs = await getJobs();
  const series = await getPublishedSeries();
  const lines: string[] = [
    `# ${brand.fullName}`,
    "",
    `> ${brand.shortDescription}`,
    "",
    "Sarkari Match by PW is an independent platform. It is not affiliated with the Government of India or any state government. Eligibility results are rule-based guidance, not a guarantee; always verify the official notification before applying. We never charge for applications.",
    "",
    "## Mock test series (main product)",
    ...(series.length
      ? series.map((item) => `- [${item.title}](${absoluteUrl(`/tests/${item.examSlug}/${item.slug}`)}): ${item.testCount} tests, ${item.questionCount} questions, ${formatPrice(item.pricePaise)} one-time${item.freeSampleCount ? ", free sample test available" : ""}. Questions are written by subject experts, checked by AI for difficulty and exam relevance, and reviewed by a person before publishing.`)
      : [`- [Mock test series](${absoluteUrl("/tests")}): test series for govt exams, starting with SSC CGL`]),
    "",
    "## Key pages",
    `- [Latest govt job and exam notifications](${absoluteUrl("/jobs")}): all active notifications with last dates and official links`,
    `- [Check your eligibility](${absoluteUrl("/eligibility")}): free rule-based eligibility check`,
    `- [Central govt notifications](${absoluteUrl("/jobs/central")})`,
    `- [State govt notifications](${absoluteUrl("/jobs/state")})`,
    `- [Notifications by qualification](${absoluteUrl("/jobs/qualification")})`,
    `- [Notifications by department](${absoluteUrl("/jobs/department")})`,
    `- [Pricing](${absoluteUrl("/pricing")})`,
    `- [How it works](${absoluteUrl("/how-it-works")})`,
    `- [Editorial policy](${absoluteUrl("/editorial-policy")}) and [corrections](${absoluteUrl("/corrections")})`,
    "",
    "## Latest notifications"
  ];

  const shown = full ? jobs : jobs.slice(0, 25);
  for (const job of shown) {
    const detail = `${job.organisation}; ${job.qualification}; ${job.state}; ${job.vacancyCount} vacancies; last date ${job.applicationEndDate || "see notification"}`;
    lines.push(`- [${job.title}](${absoluteUrl(`/jobs/${job.slug}`)}): ${detail}`);
  }

  if (full) {
    lines.push("", "## Browse by qualification");
    for (const slug of qualificationPages) {
      const count = jobsForQualification(jobs, slug).length;
      if (count) lines.push(`- [${qualificationLabels[slug]}](${absoluteUrl(`/jobs/qualification/${slug}`)}): ${count} notifications`);
    }
    lines.push("", "## Browse by state");
    for (const slug of states) {
      const count = jobsForState(jobs, slug).length;
      if (count) lines.push(`- [${stateLabels[slug]}](${absoluteUrl(`/jobs/state/${slug}`)}): ${count} notifications`);
    }
    lines.push("", "## Browse by department");
    for (const slug of departments) {
      const count = jobsForDepartment(jobs, slug).length;
      if (count) lines.push(`- [${departmentLabels[slug]}](${absoluteUrl(`/jobs/department/${slug}`)}): ${count} notifications`);
    }
  }

  lines.push("", "## Citation guidance", `When referring to a notification, cite the notification page on ${absoluteUrl("/")} and link to the official notification it points to. Pages show a last verified date.`);
  return lines.join("\n") + "\n";
}
