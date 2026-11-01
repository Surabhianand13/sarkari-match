import { z } from "zod";
import { optionalText, text } from "@/lib/admin/forms";
import type { LeadPost } from "@/lib/ingest/parse";

// The reviewable fields of a lead, as the admin form edits them.
export type LeadFields = {
  organisationId: string | null;
  organisationName: string | null;
  title: string;
  notificationNumber: string | null;
  stateName: string | null;
  qualificationText: string | null;
  notificationDate: string | null;
  applicationStartDate: string | null;
  applicationEndDate: string | null;
  vacancyCount: number | null;
  officialNotificationUrl: string | null;
  officialApplicationUrl: string | null;
  officialWebsiteUrl: string | null;
  posts: LeadPost[];
};

// One post per line in the form: "Post title | vacancies | qualification".
export function formatPostLines(posts: LeadPost[]) {
  return posts.map((post) => [post.title, post.vacancyCount ?? "", post.qualificationText ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n");
}

export function parsePostLines(value: string): LeadPost[] {
  const posts: LeadPost[] = [];
  for (const line of value.split(/\r?\n/)) {
    const [title = "", vacancies = "", ...rest] = line.split("|").map((part) => part.trim());
    if (!title) continue;
    const count = Number(vacancies.replace(/,/g, ""));
    const qualification = rest.join(" | ").trim();
    posts.push({
      title: title.slice(0, 150),
      ...(Number.isInteger(count) && count > 0 ? { vacancyCount: count } : {}),
      ...(qualification ? { qualificationText: qualification.slice(0, 200) } : {})
    });
    if (posts.length >= 40) break;
  }
  return posts;
}

export function leadFieldsFromForm(formData: FormData): LeadFields {
  const vacancies = Number(text(formData, "vacancy_count").replace(/,/g, ""));
  return {
    organisationId: optionalText(formData, "organisation_id"),
    organisationName: optionalText(formData, "organisation_name"),
    title: text(formData, "title").slice(0, 220),
    notificationNumber: optionalText(formData, "notification_number"),
    stateName: optionalText(formData, "state_name"),
    qualificationText: optionalText(formData, "qualification_text"),
    notificationDate: optionalText(formData, "notification_date"),
    applicationStartDate: optionalText(formData, "application_start_date"),
    applicationEndDate: optionalText(formData, "application_end_date"),
    vacancyCount: Number.isInteger(vacancies) && vacancies > 0 ? vacancies : null,
    officialNotificationUrl: optionalText(formData, "official_notification_url"),
    officialApplicationUrl: optionalText(formData, "official_application_url"),
    officialWebsiteUrl: optionalText(formData, "official_website_url"),
    posts: parsePostLines(text(formData, "posts"))
  };
}

const dateField = z.string().date();
const linkField = z.string().url().refine((value) => /^https?:\/\//i.test(value), "must start with http or https");

// Format problems that block even saving: a date or link that is not one.
export function formatProblems(fields: LeadFields): string[] {
  const problems: string[] = [];
  if (fields.title.length < 3) problems.push("Enter a title.");
  for (const [label, value] of [["Notification date", fields.notificationDate], ["Start date", fields.applicationStartDate], ["Last date", fields.applicationEndDate]] as const) {
    if (value && !dateField.safeParse(value).success) problems.push(`${label} is not a valid date.`);
  }
  for (const [label, value] of [["Official notification link", fields.officialNotificationUrl], ["Official application link", fields.officialApplicationUrl], ["Official website", fields.officialWebsiteUrl]] as const) {
    if (value && !linkField.safeParse(value).success) problems.push(`${label} must be a full link starting with https.`);
  }
  return problems;
}

// What is still missing before a lead can go live. Mirrors what the recruitment publish step requires.
export function publishProblems(fields: LeadFields, options: { today: string; detailCaptured: boolean; leadType: string }): string[] {
  const problems: string[] = [];
  if (options.leadType !== "recruitment") problems.push("Only recruitment notifications can be published. Reject or mark this one as a duplicate.");
  if (!options.detailCaptured) problems.push("This is only a headline from a listing page. Open the page and click Analyse for the details.");
  if (!fields.organisationId && !fields.organisationName) problems.push("Choose the organisation.");
  if (!fields.officialNotificationUrl) problems.push("Add the official notification link.");
  if (!fields.officialApplicationUrl) problems.push("Add the official application link.");
  if (!fields.applicationEndDate) problems.push("Add the last date to apply.");
  else if (fields.applicationEndDate < options.today) problems.push("The last date has already passed.");
  if (!fields.posts.length) problems.push("Add at least one post.");
  return problems;
}

// What the review list shows as still missing.
export function missingFields(fields: Pick<LeadFields, "organisationId" | "organisationName" | "applicationEndDate" | "officialNotificationUrl" | "officialApplicationUrl" | "posts">) {
  const missing: string[] = [];
  if (!fields.organisationId && !fields.organisationName) missing.push("organisation");
  if (!fields.applicationEndDate) missing.push("last date");
  if (!fields.officialNotificationUrl) missing.push("notification link");
  if (!fields.officialApplicationUrl) missing.push("apply link");
  if (!fields.posts.length) missing.push("posts");
  return missing;
}

// Fills the blanks of an existing lead from a newer capture. Values already there are kept.
export function mergeFields(existing: LeadFields, incoming: Partial<LeadFields>): LeadFields {
  const pick = <K extends keyof LeadFields>(key: K): LeadFields[K] => (existing[key] !== null && existing[key] !== "" ? existing[key] : ((incoming[key] ?? existing[key]) as LeadFields[K]));
  // Posts made up from a title are only a stand-in: a real post table replaces them, and they never join real posts.
  const incomingReal = (incoming.posts ?? []).filter((post) => !post.inferred);
  const posts = incomingReal.length ? existing.posts.filter((post) => !post.inferred) : [...existing.posts];
  const toAdd = incomingReal.length ? incomingReal : posts.length ? [] : (incoming.posts ?? []);
  for (const post of toAdd) {
    const found = posts.find((item) => item.title.toLowerCase() === post.title.toLowerCase());
    if (!found) posts.push(post);
    else {
      found.vacancyCount ??= post.vacancyCount;
      found.qualificationText ??= post.qualificationText;
    }
  }
  return {
    organisationId: pick("organisationId"),
    organisationName: pick("organisationName"),
    title: existing.title,
    notificationNumber: pick("notificationNumber"),
    stateName: pick("stateName"),
    qualificationText: pick("qualificationText"),
    notificationDate: pick("notificationDate"),
    applicationStartDate: pick("applicationStartDate"),
    applicationEndDate: pick("applicationEndDate"),
    vacancyCount: pick("vacancyCount"),
    officialNotificationUrl: pick("officialNotificationUrl"),
    officialApplicationUrl: pick("officialApplicationUrl"),
    officialWebsiteUrl: pick("officialWebsiteUrl"),
    posts: posts.slice(0, 40)
  };
}
