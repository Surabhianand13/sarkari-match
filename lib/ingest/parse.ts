import { z } from "zod";
import { normalizeQualificationLevel } from "@/lib/matching/profile";

// Turns a page captured by the collector extension into structured notification fields.
// Rules only, no AI: a person checks every field against the official notification before anything is published.

export const leadTypes = ["recruitment", "admit_card", "result", "answer_key", "other"] as const;
export type LeadType = (typeof leadTypes)[number];

export const leadTypeLabels: Record<LeadType, string> = {
  recruitment: "Recruitment",
  admit_card: "Admit card",
  result: "Result",
  answer_key: "Answer key",
  other: "Other"
};

// Caps keep one capture small. The extension trims to these before sending; the API rejects anything larger.
export const capturePayloadSchema = z.object({
  mode: z.enum(["page", "list"]),
  url: z.string().url().max(2000),
  title: z.string().max(500),
  text: z.string().max(120_000),
  // `context` is the label next to a link: the first cell of its table row ("Apply Online"), or the words around it.
  links: z.array(z.object({ href: z.string().max(2000), text: z.string().max(300), context: z.string().max(400).optional() })).max(600),
  tables: z.array(z.array(z.array(z.string().max(300)).max(14)).max(100)).max(20),
  // The date a listing showed for this page. A newer one later means the site updated the notification.
  listingDate: z.string().date().optional()
});
export type CapturePayload = z.infer<typeof capturePayloadSchema>;

export type ParseContext = {
  organisations: Array<{ id: string; name: string; shortName: string | null; website: string | null }>;
  states: string[];
};

// `inferred` marks a post made up from the page title because the page had no post table. A real table replaces it.
export type LeadPost = { title: string; vacancyCount?: number; qualificationText?: string; inferred?: boolean };
export type LinkKind = "notification" | "apply" | "website" | "other";
// `official` is a government or known organisation site. `rowLabelled` means the page itself labelled the link ("Apply Online" in its links table).
export type DetectedLink = { href: string; text: string; official: boolean; kind: LinkKind; rowLabelled: boolean };

export type ParsedLead = {
  leadType: LeadType;
  title: string;
  organisationId?: string;
  organisationName?: string;
  stateName?: string;
  notificationNumber?: string;
  qualificationText?: string;
  salaryText?: string;
  notificationDate?: string;
  applicationStartDate?: string;
  applicationEndDate?: string;
  vacancyCount?: number;
  officialNotificationUrl?: string;
  officialApplicationUrl?: string;
  officialWebsiteUrl?: string;
  posts: LeadPost[];
  links: DetectedLink[];
};

// ---- URLs ----

export function siteOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

// The address as stored: http(s) only, without the fragment or tracking parameters.
export function cleanUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return null;
  }
}

// Two addresses that point at the same page give the same key.
export function urlKey(raw: string): string | null {
  const clean = cleanUrl(raw);
  if (!clean) return null;
  const url = new URL(clean);
  return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}${url.search}`;
}

const blockedHosts = /(^|\.)(t\.me|telegram\.(me|org)|whatsapp\.com|wa\.me|facebook\.com|fb\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|youtu\.be|linkedin\.com|play\.google\.com|apps\.apple\.com|pinterest\.com)$/;
const governmentHosts = /(^|\.)(gov\.in|nic\.in|ac\.in|edu\.in|gov)$/;

function hostMatches(host: string, site: string) {
  return host === site || host.endsWith(`.${site}`);
}

// ---- Dates ----

const monthNumbers: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const dateSource = String.raw`(?:\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?[\s\-]+(?:of\s+)?[A-Za-z]{3,9}\.?,?[\s\-]+\d{4}|[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})`;

function isoFrom(year: number, month: number, day: number) {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Indian pages write dates day first (15/12/2026), so that is how numeric dates are read.
export function toIsoDate(raw: string): string | undefined {
  const value = raw.trim();
  let match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return isoFrom(Number(match[1]), Number(match[2]), Number(match[3]));
  match = value.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})$/);
  if (match) return isoFrom(Number(match[3]), Number(match[2]), Number(match[1]));
  match = value.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-]+(?:of\s+)?([A-Za-z]{3,9})\.?,?[\s\-]+(\d{4})$/);
  if (match) {
    const month = monthNumbers[match[2].slice(0, 3).toLowerCase()];
    return month ? isoFrom(Number(match[3]), month, Number(match[1])) : undefined;
  }
  match = value.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (match) {
    const month = monthNumbers[match[1].slice(0, 3).toLowerCase()];
    return month ? isoFrom(Number(match[3]), month, Number(match[2])) : undefined;
  }
  return undefined;
}

// The first date that follows one of the labels, within a short distance and on the same row. Labels about fees are skipped
// because the fee deadline is often earlier than the deadline to apply.
function dateAfterLabel(text: string, label: string, skip = /\b(fee|payment|correction|edit|admit)/i) {
  // Pages repeat words by mistake ("26th July July 2026").
  const flat = text.replace(/\b([A-Za-z]{3,9})(\s+\1\b)+/gi, "$1");
  const pattern = new RegExp(`(?:${label})([\\s\\S]{0,70}?)(${dateSource})`, "gi");
  for (const match of flat.matchAll(pattern)) {
    // Blank lines may separate a label from its value, but another row's words mean the date belongs to something else.
    if (skip.test(match[1]) || match[1].split("\n").slice(1).some((line) => /[A-Za-z]/.test(line))) continue;
    const iso = toIsoDate(match[2]);
    if (iso) return iso;
  }
  return undefined;
}

// ---- Classification ----

export function classifyTitle(title: string): LeadType {
  if (/admit\s*card|hall\s*ticket|call\s*letter/i.test(title)) return "admit_card";
  if (/answer\s*key|response\s*sheet/i.test(title)) return "answer_key";
  if (/\bresults?\b|merit\s*list|cut\s*-?\s*off|score\s*card/i.test(title)) return "result";
  if (/recruitment|vacanc|notification|apply\s*online|(?:on|off)line\s*form|\bbharti\b|\bjobs?\b|\bposts?\b|\bapprentice/i.test(title)) return "recruitment";
  return "other";
}

// "SSC CGL Recruitment 2026 - SomeSite.com" -> "SSC CGL Recruitment 2026". Only a short trailing part that says nothing
// about the notification is treated as the site name, so "Notification Out - Apply Online for 660 Posts" stays whole.
export function cleanTitle(raw: string) {
  // The split keeps the separators, so what stays is the original text.
  const parts = raw.replace(/\s+/g, " ").trim().split(/(\s+[|\u2013\u2014-]\s+)/);
  while (parts.length > 2 && parts[parts.length - 1].length <= 30 && !/recruit|notif|apply|vacanc|posts?\b|online|form|\d/i.test(parts[parts.length - 1])) parts.splice(-2);
  return parts.join("").slice(0, 220);
}

// The title as we would publish it: without the source site's search wording ("Notification Out - Apply Online for 660 Posts").
export function tidyTitle(title: string) {
  const tidy = title
    .replace(/\s*[|\u2013\u2014:,-]\s*(?:apply|check|download|know|get)\b.*$/i, "")
    .replace(/\s*\(\s*[\d,]+\s*(?:posts?|vacanc(?:y|ies))\s*\)/i, "")
    .replace(/\s+(?:notification|notice)\s+out\b/i, "")
    .replace(/\s+(?:apply\s+online|(?:on|off)line\s+form)\b/i, "")
    .replace(/\s+for\s+[\d,]+\s*(?:posts?|vacanc(?:y|ies))\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return tidy.length >= 10 ? tidy : title;
}

// ---- Field readers ----

function readNumber(raw: string) {
  const value = Number(raw.replace(/,/g, ""));
  return Number.isInteger(value) && value > 0 && value < 1_000_000 ? value : undefined;
}

const looksLikeYear = (value: number) => value >= 2020 && value <= 2035;

function readVacancyCount(title: string, text: string) {
  const labelled = text.match(/total\s*(?:no\.?\s*of\s*)?(?:vacanc(?:y|ies)|posts?|seats|positions?)[^0-9\n]{0,40}(\d[\d,]*)/i);
  if (labelled) {
    const value = readNumber(labelled[1]);
    if (value) return value;
  }
  const line = text.match(/(?:^|\n)\s*(?:vacanc(?:y|ies)|no\.?\s*of\s*(?:vacanc(?:y|ies)|posts?)|total\s*posts?)\s*[:\t]\s*(\d[\d,]*)/i);
  if (line) {
    const value = readNumber(line[1]);
    if (value) return value;
  }
  const unlabelled = [title, text.slice(0, 2500)];
  for (const source of unlabelled) {
    for (const match of source.matchAll(/\b(\d[\d,]*)\s*\+?\s*(?:posts?|vacanc(?:y|ies)|seats|positions?)\b/gi)) {
      const value = readNumber(match[1]);
      if (value && !looksLikeYear(value)) return value;
    }
  }
  return undefined;
}

// The vacancy count a headline states, such as "(3047 Vacancy)".
export function vacancyFromTitle(title: string) {
  return readVacancyCount(title, "");
}

function readNotificationNumber(text: string) {
  const match = text.match(/(?:advt\.?|advertisement|notification|recruitment|employment\s*notice|notice)\s*(?:no\.?|number)\s*[:\-–]?\s*([A-Za-z0-9][A-Za-z0-9/\-._() ]{2,40})/i);
  if (!match) return undefined;
  const value = match[1].split(/\s+(?:dated?|dt\.?|for|of)\b/i)[0].trim().replace(/[.\-/]+$/, "");
  return /\d/.test(value) && value.length >= 3 ? value : undefined;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchOrganisation(title: string, text: string, context: ParseContext) {
  const sources = [title, text.slice(0, 2500)];
  for (const source of sources) {
    let best: { org: ParseContext["organisations"][number]; length: number } | undefined;
    for (const org of context.organisations) {
      const names: Array<[string, boolean]> = [[org.name, false]];
      if (org.shortName) names.push([org.shortName, true]);
      for (const [name, wholeWord] of names) {
        if (name.length < (wholeWord ? 2 : 4)) continue;
        const pattern = new RegExp(wholeWord ? `(?<![A-Za-z])${escapeRegex(name)}(?![A-Za-z])` : escapeRegex(name), wholeWord ? "" : "i");
        if (pattern.test(source) && (!best || name.length > best.length)) best = { org, length: name.length };
      }
    }
    if (best) return best.org;
  }
  return undefined;
}

function readOrganisationLabel(text: string) {
  const match = text.match(/(?:organi[sz]ation|conducting\s*body|recruiting\s*(?:body|organi[sz]ation)|department)\s*(?:name)?[ \t]*[:\t–-][ \t]*([^\n\t]{3,90})/i);
  return match ? match[1].trim().replace(/[.,;]+$/, "") : undefined;
}

function readState(title: string, text: string, context: ParseContext) {
  const named = context.states.filter((name) => !/central/i.test(name));
  const inTitle = named.find((name) => new RegExp(`(?<![A-Za-z])${escapeRegex(name)}(?![A-Za-z])`, "i").test(title));
  if (inTitle) return inTitle;
  const label = text.match(/(?:job\s*location|place\s*of\s*posting|state)[ \t]*[:\t–-][ \t]*([^\n\t]{2,60})/i);
  if (label) return named.find((name) => label[1].toLowerCase().includes(name.toLowerCase()));
  return undefined;
}

function readQualification(title: string, text: string) {
  const labelled = text.match(/qualifications?\s*(?:details?)?[ \t]*[:\t–-][ \t]*([^\n\t]{3,200})/i);
  if (labelled) return labelled[1].trim();
  const inTitle = title.match(/\b(8th|10th|12th|graduate|graduation|post\s*graduate|iti|diploma|b\.?\s*tech|b\.?\s*e\b|nursing|b\.?\s*ed|llb)\b/i);
  return inTitle ? inTitle[1] : undefined;
}

// Posts from a "Post name | Vacancies | Qualification" table, the way most notification pages lay them out.
// A header row must name the post column AND another column (vacancies or qualification); a two-cell "Post Name | Clerk" row
// of an overview table is not a header.
const postHeader = /post\s*name|name\s*of\s*(?:the\s*)?post|^posts?$|designation|post\s*title/i;

function readPosts(tables: string[][][]): { posts: LeadPost[]; total?: number } {
  for (const table of tables) {
    const headerIndex = table.slice(0, 3).findIndex((row) => row.some((cell) => postHeader.test(cell.trim())) && row.some((cell) => /vacanc|qualification|eligib|no\.?\s*of\s*posts?|total|seats/i.test(cell)));
    if (headerIndex < 0) continue;
    const header = table[headerIndex];
    const postColumn = header.findIndex((cell) => postHeader.test(cell.trim()));
    // "Previous Vacancies | Revised Vacancy": the newest figure is the one that counts.
    const vacancyColumns = header.map((cell, index) => (index !== postColumn && /vacanc|no\.?\s*of\s*posts?|total|seats|posts?\s*count/i.test(cell) ? index : -1)).filter((index) => index >= 0);
    const vacancyColumn = vacancyColumns.find((index) => /revised|updated|latest|total/i.test(header[index])) ?? vacancyColumns[vacancyColumns.length - 1] ?? -1;
    const qualificationColumn = header.findIndex((cell, index) => index !== postColumn && /qualification|eligib/i.test(cell));
    const posts: LeadPost[] = [];
    let total: number | undefined;
    for (const row of table.slice(headerIndex + 1)) {
      const title = (row[postColumn] ?? "").replace(/\s+/g, " ").trim();
      const vacancy = vacancyColumn >= 0 ? readNumber((row[vacancyColumn] ?? "").match(/\d[\d,]*/)?.[0] ?? "") : undefined;
      // A total row is often two cells in a wider table ("Total | 7,268"), so the label may not be in the post column.
      const filled = row.map((cell) => cell.trim()).filter(Boolean);
      if (/^total\b/i.test(title) || (filled.length <= 2 && /^(?:grand\s+)?total\b/i.test(filled[0] ?? ""))) {
        total = vacancy ?? readNumber([...filled].reverse().find((cell) => /\d/.test(cell))?.match(/\d[\d,]*/)?.[0] ?? "") ?? total;
        continue;
      }
      // A number is never a post name: it is a count that landed in the wrong column.
      if (!title || title.length > 150 || /^[\d,.\s]+$/.test(title) || /^s\.?\s*no/i.test(title)) continue;
      if (posts.some((post) => post.title.toLowerCase() === title.toLowerCase())) continue;
      const qualification = qualificationColumn >= 0 ? (row[qualificationColumn] ?? "").replace(/\s+/g, " ").trim().slice(0, 200) : "";
      posts.push({ title, ...(vacancy ? { vacancyCount: vacancy } : {}), ...(qualification ? { qualificationText: qualification } : {}) });
      if (posts.length >= 40) break;
    }
    if (posts.length) return { posts, total };
  }
  return { posts: [] };
}

// The overview table's "Post Name | Artisan Grade-IV" row, used only as a stand-in when there is no real post table.
function readOverviewPosts(tables: string[][][]): LeadPost[] {
  for (const table of tables) {
    for (const row of table) {
      if (row.length !== 2 || !postHeader.test(row[0].trim())) continue;
      const names = row[1].split(/\s*(?:,|;|\band\b|&)\s*/i).map((name) => name.replace(/\s+/g, " ").trim()).filter((name) => name.length >= 3 && name.length <= 80);
      if (names.length && names.length <= 12) return names.map((title) => ({ title, inferred: true }));
    }
  }
  return [];
}

// ---- Links ----

// What a link is for, from its label.
function linkKind(label: string, href: string): LinkKind {
  const isPdf = /\.pdf($|\?)/i.test(href);
  if (!isPdf && (/apply|registration|online\s*form|candidate\s*(?:login|corner)|login/i.test(label) || /apply|registration|login/i.test(href))) return "apply";
  if (isPdf || /notification|notice|advt|advertis|detailed|official\s*pdf|brochure/i.test(label)) return "notification";
  if (/official\s*(?:web)?site|website|home\s*page|careers?\s*portal/i.test(label)) return "website";
  return "other";
}

function detectLinks(links: CapturePayload["links"], pageUrl: string, context: ParseContext, organisationWebsite?: string | null): DetectedLink[] {
  const pageSite = siteOf(pageUrl);
  const officialSites = context.organisations.map((org) => (org.website ? siteOf(org.website) : "")).filter(Boolean);
  if (organisationWebsite) officialSites.push(siteOf(organisationWebsite));
  const seen = new Set<string>();
  const detected: DetectedLink[] = [];
  for (const link of links) {
    const href = cleanUrl(link.href);
    if (!href) continue;
    const host = siteOf(href);
    if (!host || hostMatches(host, pageSite) || blockedHosts.test(host)) continue;
    const key = urlKey(href);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const text = link.text.replace(/\s+/g, " ").trim().slice(0, 140);
    const label = (link.context ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    const official = governmentHosts.test(host) || officialSites.some((site) => hostMatches(host, site));
    const kind = linkKind(`${label} ${text}`, href);
    detected.push({ href, text: text || label, official, kind, rowLabelled: Boolean(label) && linkKind(label, "") === kind && kind !== "other" });
    if (detected.length >= 80) break;
  }
  // Government links first, then the ones that look like notification or apply links.
  const rank = (link: DetectedLink) => (link.official ? 0 : 2) + (link.kind === "other" ? 1 : 0);
  return detected.sort((a, b) => rank(a) - rank(b));
}

// The best link of a kind. A government site is trusted on its own. Any other site is only taken when the page
// labelled that very link ("Apply Online" in its links table), so an advert for a coaching course is never chosen.
function chooseLink(links: DetectedLink[], kind: LinkKind) {
  const sameKind = links.filter((link) => link.kind === kind);
  const pool = sameKind.some((link) => link.official) ? sameKind.filter((link) => link.official) : sameKind.filter((link) => link.rowLabelled);
  const score = (link: DetectedLink) => {
    const label = `${link.text}`;
    return (/detailed|official\s*(?:notification|notice|advertisement)|advertisement|notification\s*pdf|advt/i.test(label) ? 2 : 0) + (/\.pdf($|\?)/i.test(link.href) ? 1 : 0) - (/corrigendum|revised|addendum|extension|extended|vacancy\s*details|break-?up|syllabus|pattern|result|admit|answer|cut-?off|merit/i.test(label) ? 3 : 0);
  };
  return pool.reduce<DetectedLink | undefined>((best, link) => (!best || score(link) > score(best) ? link : best), undefined);
}

// ---- The whole page ----

// ---- Pay ----

const payLabel = String.raw`(?:salary|pay\s*scales?|pay\s*band|pay\s*level|pay\s*matrix|remuneration|stipend|emoluments?|(?:monthly|consolidated)\s*(?:pay|salary))(?:\s*/\s*(?:salary|stipend|pay\s*scales?))?`;
const money = String.raw`(?:rs\.?|₹|inr)\s*[\d,]+(?:\.\d+)?(?:\s*(?:-|–|—|to)\s*(?:(?:rs\.?|₹|inr)\s*)?[\d,]+(?:\.\d+)?)?(?:\s*(?:/-|per\s*month|p\.?\s*m\.?|monthly|per\s*annum|p\.?\s*a\.?))*`;

function tidyPay(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/^[:\-–\s]+|[;,.\s]+$/g, "").slice(0, 200);
}

// The pay a page states: the "Salary" row of its overview table, a "Pay Scale: ..." line, a sentence naming the pay with an amount,
// or the amounts listed under a "Salary" heading. Always text for a person to check, never a number the site computes with.
function readSalary(text: string, tables: string[][][]) {
  for (const table of tables) {
    for (const row of table) {
      if (row.length >= 2 && new RegExp(`^\\s*${payLabel}\\s*(?:details?)?\\s*:?\\s*$`, "i").test(row[0]) && /\d/.test(row[1])) return tidyPay(row[1]);
    }
  }
  const labelled = text.match(new RegExp(`(?:^|\\n)[ \\t]*${payLabel}[ \\t]*(?:details?)?[ \\t]*[:\\t–-][ \\t]*([^\\n\\t]{3,200})`, "i"));
  if (labelled && /\d/.test(labelled[1])) return tidyPay(labelled[1]);

  for (const sentence of text.split(/(?<=[.!?])\s+(?=[A-Z])|\n+/)) {
    if (!new RegExp(payLabel, "i").test(sentence)) continue;
    const amount = sentence.match(new RegExp(money, "i"));
    if (amount) return tidyPay(amount[0]);
  }

  const lines = text.split("\n").map((line) => line.trim());
  const heading = lines.findIndex((line) => new RegExp(`^${payLabel}\\s*(?:details?)?\\s*:?$`, "i").test(line));
  if (heading >= 0) {
    const block: string[] = [];
    for (const line of lines.slice(heading + 1, heading + 12)) {
      if (!line) continue;
      if (block.length && line.length < 40 && !/\d/.test(line)) break;
      block.push(line);
    }
    const amounts = payAmounts(block.join("\n"));
    if (amounts.length > 1) return `Rs. ${Math.min(...amounts).toLocaleString("en-IN")} - Rs. ${Math.max(...amounts).toLocaleString("en-IN")} per month (varies by post)`;
    const first = block.find((line) => /\d/.test(line));
    if (first) return tidyPay(first);
  }
  return undefined;
}

function payAmounts(text: string) {
  const amounts: number[] = [];
  for (const match of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const raw = match[0];
    const value = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(value) || value < 1000 || value > 1_000_000) continue;
    if (!raw.includes(",") && looksLikeYear(value)) continue;
    amounts.push(Math.round(value));
  }
  return amounts;
}

// The lowest and highest amount in a pay text, stored beside it so the site can sort and filter by pay later.
export function salaryBounds(text?: string | null): { min: number; max: number } | undefined {
  const amounts = text ? payAmounts(text) : [];
  return amounts.length ? { min: Math.min(...amounts), max: Math.max(...amounts) } : undefined;
}

// "II PUC/Diploma (Typist, Typist-Copyist); SSLC (Process Server, Peon)": a qualification that names the posts it is for.
function qualificationsByPost(posts: LeadPost[], qualificationText?: string): LeadPost[] {
  if (!qualificationText || !qualificationText.includes(";")) return posts;
  const bySegment = qualificationText.split(";").map((segment) => segment.trim().match(/^(.+?)\s*\(([^()]+)\)\.?$/)).filter((found): found is RegExpMatchArray => Boolean(found));
  if (bySegment.length < 2) return posts;
  return posts.map((post) => {
    if (post.qualificationText) return post;
    const own = bySegment.find(([, , names]) => names.split(/,|\/|\band\b/i).some((name) => name.trim().toLowerCase() === post.title.toLowerCase()));
    return own ? { ...post, qualificationText: own[1].trim().slice(0, 200) } : post;
  });
}

export function parseCapture(payload: CapturePayload, context: ParseContext): ParsedLead {
  const text = payload.text.replace(/\r/g, "");
  const title = cleanTitle(payload.title);
  const organisation = matchOrganisation(title, text, context);
  const organisationName = organisation?.name ?? readOrganisationLabel(text);
  const links = detectLinks(payload.links, payload.url, context, organisation?.website);

  const { posts: tablePosts, total } = readPosts(payload.tables);
  const posts = tablePosts.length ? tablePosts : readOverviewPosts(payload.tables);
  const vacancyCount = readVacancyCount(title, text) ?? total ?? (posts.length && posts.every((post) => post.vacancyCount) ? posts.reduce((sum, post) => sum + (post.vacancyCount ?? 0), 0) : undefined);
  const qualificationText = readQualification(title, text);
  const salaryText = readSalary(text, payload.tables);

  return {
    leadType: classifyTitle(title),
    title,
    ...(organisation ? { organisationId: organisation.id } : {}),
    ...(organisationName ? { organisationName } : {}),
    stateName: readState(title, text, context),
    notificationNumber: readNotificationNumber(text),
    qualificationText,
    ...(salaryText ? { salaryText } : {}),
    notificationDate: dateAfterLabel(text, String.raw`notification\s*date|date\s*of\s*(?:notification|advertisement|publication)|advt\.?\s*date|release\s*date|(?:^|\n)\s*notification(?=[ \t]*[:\t\n])`, /$^/),
    applicationStartDate: dateAfterLabel(text, String.raw`start(?:ing)?\s*date|begin(?:ning)?\s*(?:date|of)?|commencement|opening\s*date|(?:application|registration)s?\s*(?:start|begin|open)s?|start\s*of\s*(?:online\s*)?application|apply\s*online\s*(?:start|begin)s?`),
    applicationEndDate: dateAfterLabel(text, String.raw`last\s*date|closing\s*date|end\s*date|apply\s*(?:online\s*)?(?:till|before|until|up\s*to|upto)|(?:application|registration)s?\s*(?:end|close)s?|deadline`),
    vacancyCount,
    officialNotificationUrl: chooseLink(links, "notification")?.href,
    officialApplicationUrl: chooseLink(links, "apply")?.href,
    officialWebsiteUrl: chooseLink(links, "website")?.href ?? (organisation?.website ? (cleanUrl(organisation.website) ?? undefined) : undefined),
    posts: posts.length ? qualificationsByPost(posts, qualificationText).map((post) => (post.inferred && !post.vacancyCount && posts.length === 1 && vacancyCount ? { ...post, vacancyCount } : post)) : title ? [{ title: fallbackPostTitle(title), ...(vacancyCount ? { vacancyCount } : {}), inferred: true }] : [],
    links
  };
}

// With no post table, the notification itself becomes the single post: "SSC CGL Recruitment 2026" -> "SSC CGL 2026".
function fallbackPostTitle(title: string) {
  return title.replace(/\b(?:recruitment|notification|apply\s*online|online\s*form)\b/gi, " ").replace(/\s+/g, " ").trim().slice(0, 150) || title;
}

// A listing page: every headline linking to another page on the same site that looks like a notification.
export type ListingEntry = { title: string; url: string; leadType: LeadType; postedOn?: string; lastDate?: string };

// A listing laid out as a table has "Get Details" as its link and the notification in the cells around it:
// "02/11/2026 | Nainital Bank | HR Advisor - 1 Posts | Retired Staff | - | 07-11-2026 | Get Details".
const genericLinkText = /^(?:get\s*)?(?:details?|more\s*(?:info(?:rmation)?|details?)|read\s*more|view(?:\s*details?)?|click\s*here|apply(?:\s*online)?|link|download)$/i;
const dateCell = /^\d{1,2}\s*[\/\-.]\s*\d{1,2}\s*[\/\-.]\s*\d{4}$/;

function readRow(context: string | undefined) {
  const cells = (context ?? "").split(" | ").map((cell) => cell.trim()).filter(Boolean);
  if (cells.length < 3) return undefined;
  const postedOn = dateCell.test(cells[0]) ? toIsoDate(cells[0]) : undefined;
  const lastDate = [...cells.slice(1)].reverse().map((cell) => (dateCell.test(cell) ? toIsoDate(cell) : undefined)).find(Boolean);
  const words = cells.filter((cell) => !dateCell.test(cell) && !genericLinkText.test(cell) && cell !== "-" && cell !== "\u2013");
  return { postedOn, lastDate, title: words.slice(0, 2).join(" ").replace(/\s+/g, " ").trim() };
}

// A category or menu link ("Latest Notifications", "/bank-jobs/") is a listing, not one notification.
const menuTitle = /^(?:(?:latest|all|new|top|upcoming|govt\.?|government|sarkari)\s+)*(?:notifications?|jobs?|recruitments?|vacancies|updates?|alerts?)$/i;
function isCategoryUrl(url: string) {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return segments.length <= 1 && new URL(url).pathname.endsWith("/");
  } catch {
    return false;
  }
}

export function parseListing(payload: CapturePayload): ListingEntry[] {
  const pageSite = siteOf(payload.url);
  const seen = new Set<string>();
  const entries: ListingEntry[] = [];
  for (const link of payload.links) {
    const url = cleanUrl(link.href);
    const row = genericLinkText.test(link.text.trim()) ? readRow(link.context) : undefined;
    const title = cleanTitle(row?.title || link.text);
    if (!url || title.length < 12 || title.length > 200 || menuTitle.test(title) || isCategoryUrl(url)) continue;
    const host = siteOf(url);
    if (!hostMatches(host, pageSite) && !hostMatches(pageSite, host)) continue;
    const key = urlKey(url);
    if (!key || seen.has(key) || key === urlKey(payload.url)) continue;
    // Only recruitments become leads (admit cards and results are not published here), and a menu item such as
    // "Engineering Jobs" is not a notification: it needs a notification word or a number in it.
    // A table row that has a last date to apply is a notification even when its title has no recruitment word.
    const leadType = classifyTitle(title) === "other" && row?.lastDate ? "recruitment" : classifyTitle(title);
    if (leadType !== "recruitment" || !(row?.lastDate || /recruitment|vacanc|notification|(?:on|off)line\s*form|bharti|apprentice/i.test(title) || /\d/.test(title))) continue;
    seen.add(key);
    entries.push({ title, url, leadType, ...(row?.postedOn ? { postedOn: row.postedOn } : {}), ...(row?.lastDate ? { lastDate: row.lastDate } : {}) });
    if (entries.length >= 600) break;
  }
  return entries;
}

// ---- Matching the same notification across sites ----

const fillerWords = new Set(["recruitment", "notification", "notice", "apply", "online", "offline", "for", "the", "of", "and", "in", "to", "a", "an", "posts", "post", "vacancy", "vacancies", "out", "released", "official", "new", "form", "latest", "jobs", "job", "bharti", "application", "advt", "advertisement", "no", "check", "details", "here", "pdf", "download", "exam", "date", "schedule", "mains", "prelims", "revised", "extended", "declared", "announced"]);

function titleTokens(title: string) {
  return new Set(title.toLowerCase().replace(/(\d),(\d)/g, "$1$2").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((word) => word && !fillerWords.has(word)));
}

export function titleSimilarity(a: string, b: string) {
  const left = titleTokens(a);
  const right = titleTokens(b);
  if (left.size < 2 || right.size < 2) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  const jaccard = shared / (left.size + right.size - shared);
  // One site's title often carries extra words ("Mains Exam Schedule"). When the shorter title is wholly inside the longer one, that is a match too.
  const overlap = shared >= 4 ? shared / Math.min(left.size, right.size) : 0;
  return Math.max(jaccard, overlap * 0.85);
}

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export type MatchKey = {
  leadType?: LeadType;
  title: string;
  organisationName?: string | null;
  notificationNumber?: string | null;
  vacancyCount?: number | null;
  urls: Array<string | null | undefined>;
};
export type MatchCandidate = MatchKey & { id: string };

function sameOrganisation(a?: string | null, b?: string | null) {
  if (!a || !b) return true;
  const left = compact(a);
  const right = compact(b);
  return left === right || left.includes(right) || right.includes(left);
}

// Strongest signal first: the same official link, then the same notification number, then a very similar title.
export function findMatch<T extends MatchCandidate>(key: MatchKey, candidates: T[]): { candidate: T; reason: string } | null {
  const keyUrls = new Set(key.urls.map((url) => (url ? urlKey(url) : null)).filter((value): value is string => Boolean(value)));
  const pool = candidates.filter((candidate) => !key.leadType || !candidate.leadType || candidate.leadType === key.leadType);

  for (const candidate of pool) {
    const shared = candidate.urls.map((url) => (url ? urlKey(url) : null)).find((value) => value && value.includes("/") && keyUrls.has(value));
    if (shared) return { candidate, reason: "same official link" };
  }
  // A short number like "01/2026" is reused by many organisations, so it needs the organisation to agree. A long one is specific enough alone.
  if (key.notificationNumber && compact(key.notificationNumber).length >= 4) {
    const number = compact(key.notificationNumber);
    for (const candidate of pool) {
      if (!candidate.notificationNumber || compact(candidate.notificationNumber) !== number) continue;
      if (number.length >= 10 || sameOrganisation(key.organisationName, candidate.organisationName)) return { candidate, reason: "same notification number" };
    }
  }
  let best: { candidate: T; score: number } | undefined;
  for (const candidate of pool) {
    if (!sameOrganisation(key.organisationName, candidate.organisationName)) continue;
    const score = titleSimilarity(key.title, candidate.title);
    const sameVacancies = Boolean(key.vacancyCount && candidate.vacancyCount && key.vacancyCount === candidate.vacancyCount);
    const differentVacancies = Boolean(key.vacancyCount && candidate.vacancyCount && key.vacancyCount !== candidate.vacancyCount);
    const needed = sameVacancies ? 0.55 : differentVacancies ? 0.9 : 0.75;
    if (score >= needed && (!best || score > best.score)) best = { candidate, score };
  }
  return best ? { candidate: best.candidate, reason: "very similar title" } : null;
}

// ---- Where two sites disagree ----

export type SourceView = { site: string; parsed: Partial<ParsedLead> };
export type Conflict = { field: string; label: string; values: Array<{ site: string; value: string }> };

const conflictFields: Array<[keyof ParsedLead, string, (value: unknown) => string]> = [
  ["applicationEndDate", "Last date", String],
  ["applicationStartDate", "Start date", String],
  ["vacancyCount", "Vacancies", String],
  ["notificationNumber", "Notification number", (value) => compact(String(value))]
];

export function findConflicts(sources: SourceView[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const [field, label, normalise] of conflictFields) {
    const values = sources.filter((source) => source.parsed[field] !== undefined && source.parsed[field] !== null && source.parsed[field] !== "").map((source) => ({ site: source.site, value: String(source.parsed[field]), key: normalise(source.parsed[field]) }));
    if (new Set(values.map((value) => value.key)).size > 1) conflicts.push({ field, label, values: values.map(({ site, value }) => ({ site, value })) });
  }
  return conflicts;
}

export function qualificationLevelOf(text?: string | null) {
  return text ? normalizeQualificationLevel(text) : undefined;
}
