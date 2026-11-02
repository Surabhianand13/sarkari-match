import { describe, expect, it } from "vitest";
import { cleanUrl, classifyTitle, findConflicts, findMatch, parseCapture, parseListing, salaryBounds, tidyTitle, titleSimilarity, toIsoDate, urlKey, type CapturePayload, type ParseContext } from "@/lib/ingest/parse";

const context: ParseContext = {
  organisations: [
    { id: "org-ssc", name: "Staff Selection Commission", shortName: "SSC", website: "https://ssc.gov.in" },
    { id: "org-bpsc", name: "Bihar Public Service Commission", shortName: "BPSC", website: "https://bpsc.bih.nic.in" }
  ],
  states: ["Bihar", "Karnataka", "Central Government"]
};

const detailPage: CapturePayload = {
  mode: "page",
  url: "https://rival-jobs.example/ssc-cgl-2026?utm_source=telegram#top",
  title: "SSC CGL Recruitment 2026 for 14582 Posts - Rival Jobs",
  text: [
    "SSC CGL Recruitment 2026",
    "Organization Name : Staff Selection Commission",
    "Advt. No. : SSC/CGL/2026/01 dated 10 November 2026",
    "Application Begin : 01/12/2026",
    "Last Date for Fee Payment : 14/12/2026",
    "Last Date to Apply Online : 15/12/2026",
    "Total Vacancy : 14,582",
    "Educational Qualification : Bachelor's Degree from a recognised university"
  ].join("\n"),
  links: [
    { href: "https://t.me/rivaljobs", text: "Join Telegram" },
    { href: "https://rival-jobs.example/other-page", text: "Another job" },
    { href: "https://ssc.gov.in/portal/notice/cgl-2026.pdf", text: "Download Notification" },
    { href: "https://ssc.gov.in/login", text: "Apply Online" },
    { href: "https://ssc.gov.in/", text: "Official Website" },
    { href: "https://someblog.example/ssc-cgl", text: "Read more" },
    { href: "javascript:alert(1)", text: "Click me" }
  ],
  tables: [
    [
      ["S.No", "Post Name", "Vacancy", "Qualification"],
      ["1", "Assistant Section Officer", "1,200", "Bachelor's Degree"],
      ["2", "Inspector (Central Excise)", "800", "Bachelor's Degree"],
      ["", "Total", "2,000", ""]
    ]
  ]
};

describe("toIsoDate", () => {
  it("reads day-first numbers and written months", () => {
    expect(toIsoDate("15/12/2026")).toBe("2026-12-15");
    expect(toIsoDate("5-1-2027")).toBe("2027-01-05");
    expect(toIsoDate("15th December 2026")).toBe("2026-12-15");
    expect(toIsoDate("Dec 15, 2026")).toBe("2026-12-15");
    expect(toIsoDate("2026-12-15")).toBe("2026-12-15");
  });

  it("rejects dates that do not exist", () => {
    expect(toIsoDate("31/02/2026")).toBeUndefined();
    expect(toIsoDate("15/13/2026")).toBeUndefined();
    expect(toIsoDate("soon")).toBeUndefined();
  });
});

describe("parseCapture", () => {
  const parsed = parseCapture(detailPage, context);

  it("cleans the title and recognises a recruitment", () => {
    expect(parsed.title).toBe("SSC CGL Recruitment 2026 for 14582 Posts");
    expect(parsed.leadType).toBe("recruitment");
  });

  it("finds the organisation from the organisations we already have", () => {
    expect(parsed.organisationId).toBe("org-ssc");
    expect(parsed.organisationName).toBe("Staff Selection Commission");
  });

  it("reads the last date to apply, not the fee deadline", () => {
    expect(parsed.applicationEndDate).toBe("2026-12-15");
    expect(parsed.applicationStartDate).toBe("2026-12-01");
  });

  it("reads the notification number without the trailing date", () => {
    expect(parsed.notificationNumber).toBe("SSC/CGL/2026/01");
  });

  it("reads the vacancies from the page", () => {
    expect(parsed.vacancyCount).toBe(14582);
  });

  it("only trusts government links as official, and drops social, own-site and unsafe links", () => {
    expect(parsed.officialNotificationUrl).toBe("https://ssc.gov.in/portal/notice/cgl-2026.pdf");
    expect(parsed.officialApplicationUrl).toBe("https://ssc.gov.in/login");
    expect(parsed.officialWebsiteUrl).toBe("https://ssc.gov.in/");
    const hrefs = parsed.links.map((link) => link.href);
    expect(hrefs).not.toContain("https://t.me/rivaljobs");
    expect(hrefs).not.toContain("https://rival-jobs.example/other-page");
    expect(hrefs.some((href) => href.startsWith("javascript"))).toBe(false);
    expect(parsed.links.find((link) => link.href.includes("someblog"))?.official).toBe(false);
    expect(parsed.links[0].official).toBe(true);
  });

  it("takes the posts from the post table and skips the total row", () => {
    expect(parsed.posts).toEqual([
      { title: "Assistant Section Officer", vacancyCount: 1200, qualificationText: "Bachelor's Degree" },
      { title: "Inspector (Central Excise)", vacancyCount: 800, qualificationText: "Bachelor's Degree" }
    ]);
  });

  it("falls back to one post named after the notification when there is no table", () => {
    const withoutTable = parseCapture({ ...detailPage, tables: [] }, context);
    expect(withoutTable.posts).toHaveLength(1);
    expect(withoutTable.posts[0].vacancyCount).toBe(14582);
  });

  it("takes the state from the title when a state is named", () => {
    const bihar = parseCapture({ ...detailPage, title: "Bihar Police Constable Recruitment 2026", text: "Last Date: 20-12-2026", links: [], tables: [] }, context);
    expect(bihar.stateName).toBe("Bihar");
    expect(bihar.applicationEndDate).toBe("2026-12-20");
  });

  it("does not mistake a year for a vacancy count", () => {
    const year = parseCapture({ ...detailPage, title: "Railway Recruitment 2026 Posts Notification", text: "", links: [], tables: [] }, context);
    expect(year.vacancyCount).toBeUndefined();
  });

  it("leaves unknown fields empty instead of guessing", () => {
    const bare = parseCapture({ ...detailPage, title: "Some Departmental Recruitment", text: "Apply soon.", links: [], tables: [] }, context);
    expect(bare.applicationEndDate).toBeUndefined();
    expect(bare.officialApplicationUrl).toBeUndefined();
    expect(bare.organisationId).toBeUndefined();
  });
});

describe("tidyTitle", () => {
  it("drops the source site's search wording and keeps the name of the recruitment", () => {
    expect(tidyTitle("BHEL Artisan Recruitment 2026 Notification Out \u2013 Apply Online for 660 Posts")).toBe("BHEL Artisan Recruitment 2026");
    expect(tidyTitle("ONGC Apprentice Online Form 2026 (3047 Vacancy)")).toBe("ONGC Apprentice 2026");
    expect(tidyTitle("SSC CGL Recruitment 2026 for 14582 Posts")).toBe("SSC CGL Recruitment 2026");
    expect(tidyTitle("Apply Online")).toBe("Apply Online");
  });
});

describe("classifyTitle", () => {
  it("tells recruitments from results, admit cards and answer keys", () => {
    expect(classifyTitle("UPSC Civil Services Recruitment 2026")).toBe("recruitment");
    expect(classifyTitle("SSC CGL 2026 Admit Card Out")).toBe("admit_card");
    expect(classifyTitle("SSC CHSL Result 2026 Declared")).toBe("result");
    expect(classifyTitle("IBPS PO Answer Key 2026")).toBe("answer_key");
    expect(classifyTitle("How to prepare for exams")).toBe("other");
  });
});

describe("parseListing", () => {
  const listing: CapturePayload = {
    mode: "list",
    url: "https://rival-jobs.example/",
    title: "Rival Jobs",
    text: "",
    tables: [],
    links: [
      { href: "https://rival-jobs.example/ssc-cgl-2026", text: "SSC CGL Recruitment 2026 Apply Online" },
      { href: "https://rival-jobs.example/ssc-cgl-2026#comments", text: "SSC CGL Recruitment 2026 Apply Online" },
      { href: "https://rival-jobs.example/about", text: "About us" },
      { href: "https://rival-jobs.example/ssc-chsl-result", text: "SSC CHSL Result 2026 Declared" },
      { href: "https://ssc.gov.in/", text: "SSC Official Website Recruitment" },
      { href: "https://rival-jobs.example/privacy", text: "Privacy policy for all visitors here" }
    ]
  };

  it("keeps same-site recruitment headlines once each, and drops results, admit cards and menu items", () => {
    const withNoise: CapturePayload = {
      ...listing,
      links: [
        ...listing.links,
        { href: "https://rival-jobs.example/engineering-jobs/", text: "Engineering Jobs" },
        { href: "https://rival-jobs.example/ongc-apprentice", text: "ONGC Apprentice Online Form 2026 (3047 Vacancy)" },
        { href: "https://rival-jobs.example/india-post", text: "India Post Skilled Artisan Offline Form 2026" },
        { href: "https://rival-jobs.example/rrb-alp-admit", text: "RRB ALP CBT 1 Admit Card 2026 Out" },
        { href: "https://rival-jobs.example/sbi-clerk-syllabus", text: "SBI Clerk Syllabus" }
      ]
    };
    expect(parseListing(withNoise).map((entry) => entry.title)).toEqual([
      "SSC CGL Recruitment 2026 Apply Online",
      "ONGC Apprentice Online Form 2026 (3047 Vacancy)",
      "India Post Skilled Artisan Offline Form 2026"
    ]);
  });
});

// Page layouts of the two sites we collect from: key-value overview tables, a links table whose label sits in the first cell,
// tab-separated text, and long-lived hub pages with few official links. The wording here is invented; only the shape is theirs.
describe("parsing the real page layouts", () => {
  const aggregatorOrganisations: ParseContext = { organisations: [], states: ["Bihar", "Karnataka"] };

  const alertPage: CapturePayload = {
    mode: "page",
    url: "https://www.alert-site.example/articles/bhel-artisan-recruitment-2026-3073301",
    title: "BHEL Artisan Recruitment 2026 Notification Out \u2013 Apply Online for 660 Posts",
    text: [
      "Bharat Heavy Electricals Limited (BHEL) has released Notification No. 01/2026 for 660 vacancies.",
      "Recruiting Organization\tBharat Heavy Electricals Limited (BHEL)",
      "Advertisement Number\t01/2026",
      "Post Name\tArtisan Grade-IV",
      "Total Vacancies\t660",
      "Qualification\tClass 10 + NTC/ITI + NAC in the respective trade",
      "Application Start Date\t21 October 2026, 10:00 AM",
      "Application Last Date\t18 November 2026, 11:45 PM",
      "Tentative Examination Date\t11 December 2026",
      "Job Location\tNine Manufacturing Units Across India",
      "Qualification and Age Cut-off Date\t1 October 2026"
    ].join("\n"),
    links: [
      { href: "https://careers.bhel.example/ar/Artisan%20Corrigendum.pdf", text: "See the notice" },
      { href: "https://careers.bhel.example/index.jsp", text: "BHEL Careers Portal", context: "Apply Online" },
      { href: "https://careers.bhel.example/ar/Artisan_Detailed%20AD.pdf", text: "Advertisement 01/2026", context: "Detailed Advertisement" },
      { href: "https://careers.bhel.example/ar/Breakup%20of%20Vacancies.pdf", text: "Official Portal", context: "Unit-Wise Vacancy Details" },
      { href: "https://www.bhel.example/", text: "www.bhel.example", context: "Official Website" },
      { href: "https://coaching.example/free-demo", text: "Apply for a free demo class" }
    ],
    tables: [
      [["Recruiting Organization", "Bharat Heavy Electricals Limited (BHEL)"], ["Advertisement Number", "01/2026"], ["Post Name", "Artisan Grade-IV"], ["Total Vacancies", "660"]],
      [["Trade", "Vacancies"], ["Fitter", "278"], ["Welder", "104"]]
    ]
  };

  it("reads label-and-value rows that are separated by tabs", () => {
    const parsed = parseCapture(alertPage, aggregatorOrganisations);
    expect(parsed).toMatchObject({
      title: "BHEL Artisan Recruitment 2026 Notification Out \u2013 Apply Online for 660 Posts",
      organisationName: "Bharat Heavy Electricals Limited (BHEL)",
      notificationNumber: "01/2026",
      applicationStartDate: "2026-10-21",
      applicationEndDate: "2026-11-18",
      vacancyCount: 660,
      qualificationText: "Class 10 + NTC/ITI + NAC in the respective trade"
    });
    expect(parsed.notificationDate).toBeUndefined();
  });

  it("uses the label in the links table to pick official links on a company site, and ignores adverts and a corrigendum", () => {
    const parsed = parseCapture(alertPage, aggregatorOrganisations);
    expect(parsed.officialApplicationUrl).toBe("https://careers.bhel.example/index.jsp");
    expect(parsed.officialNotificationUrl).toBe("https://careers.bhel.example/ar/Artisan_Detailed%20AD.pdf");
    expect(parsed.officialWebsiteUrl).toBe("https://www.bhel.example/");
    expect(parsed.links.find((link) => link.href.includes("coaching"))?.rowLabelled).toBe(false);
  });

  it("takes the post from the overview row when there is no post table, as a stand-in only", () => {
    const parsed = parseCapture(alertPage, aggregatorOrganisations);
    expect(parsed.posts).toEqual([{ title: "Artisan Grade-IV", vacancyCount: 660, inferred: true }]);
  });

  const hubPage: CapturePayload = {
    mode: "page",
    url: "https://www.hub-site.example/jobs/ibps-so-2026/",
    title: "IBPS SO 2026 Mains Exam Date Out (1043 Vacancies), Check Mains Exam Schedule",
    text: [
      "Events\n\t\nDates\n\n\nNotification\n\t\n30 June 2026\n\nApply Online Starts\t1st July 2026\n\nLast Date to Apply\t26th July July 2026\n\nApplication Correction Window\t29th to 30th July 2026\n\nPre-Exam Training\t\u2013\n\nPrelims Exam Date\n\t\n29th August 2026",
      "Conducting Body\tInstitute of Banking Personnel Selection (IBPS)",
      "Vacancy\t1043 (Revised)"
    ].join("\n"),
    links: [{ href: "https://forms.example/survey", text: "Share details with us" }],
    tables: [
      [["Particulars", "Details"], ["Exam Name", "IBPS SO 2026"], ["Posts", "IT Officer, Law Officer"]],
      [["Post", "Previous Vacancies", "Revised Vacancy"], ["IT Officer", "301", "376"], ["Law Officer", "105", "125"], ["Total", "406", "501"]]
    ]
  };

  it("reads a hub page: a repeated month, the revised vacancy column, and a conducting body", () => {
    const parsed = parseCapture(hubPage, aggregatorOrganisations);
    expect(parsed).toMatchObject({ organisationName: "Institute of Banking Personnel Selection (IBPS)", notificationDate: "2026-06-30", applicationStartDate: "2026-07-01", applicationEndDate: "2026-07-26", vacancyCount: 1043 });
    expect(parsed.posts).toEqual([
      { title: "IT Officer", vacancyCount: 376 },
      { title: "Law Officer", vacancyCount: 125 }
    ]);
  });

  it("does not offer a survey or an advert as an official link", () => {
    const parsed = parseCapture(hubPage, aggregatorOrganisations);
    expect(parsed.officialNotificationUrl).toBeUndefined();
    expect(parsed.officialApplicationUrl).toBeUndefined();
  });

  it("recognises the two sites' different titles for one notification as the same", () => {
    expect(titleSimilarity("IBPS SO 2026 Mains Exam Date Out (1043 Vacancies), Check Mains Exam Schedule", "IBPS SO Online Form 2026 (1,043 Vacancy)")).toBeGreaterThanOrEqual(0.75);
    expect(titleSimilarity("BHEL Artisan Recruitment 2026 Notification Out \u2013 Apply Online for 660 Posts", "BHEL 660 Artisan Online Form 2026")).toBeGreaterThanOrEqual(0.75);
    expect(titleSimilarity("RRB NTPC Graduate Online Form 2026", "RRB NTPC UG Online Form 2026")).toBeLessThan(0.75);
  });
});

describe("matching the same notification across sites", () => {
  it("treats addresses with tracking or a trailing slash as the same page", () => {
    expect(urlKey("https://www.ssc.gov.in/notice/?utm_source=x#top")).toBe(urlKey("https://ssc.gov.in/notice"));
    expect(cleanUrl("https://ssc.gov.in/a?utm_medium=y&id=2#frag")).toBe("https://ssc.gov.in/a?id=2");
    expect(cleanUrl("javascript:alert(1)")).toBeNull();
  });

  const candidates = [
    { id: "a", leadType: "recruitment" as const, title: "SSC CGL 2026 Notification Out For 14582 Vacancies", organisationName: "Staff Selection Commission", notificationNumber: "SSC/CGL/2026/01", vacancyCount: 14582, urls: ["https://ssc.gov.in/portal/notice/cgl-2026.pdf"] },
    { id: "b", leadType: "recruitment" as const, title: "Bihar Police Constable Recruitment 2026", organisationName: "Bihar Police", notificationNumber: null, vacancyCount: 4000, urls: [] }
  ];

  it("matches on the same official link first", () => {
    const match = findMatch({ title: "Completely different words", urls: ["https://www.ssc.gov.in/portal/notice/cgl-2026.pdf?utm_source=a"] }, candidates);
    expect(match?.candidate.id).toBe("a");
    expect(match?.reason).toBe("same official link");
  });

  it("matches on the same notification number for the same organisation", () => {
    const match = findMatch({ title: "Other words", organisationName: "SSC", notificationNumber: "ssc/cgl/2026/01", urls: [] }, candidates);
    expect(match?.candidate.id).toBe("a");
  });

  it("matches a very similar title, and stays apart for a different one", () => {
    expect(titleSimilarity("SSC CGL Recruitment 2026 for 14582 Posts", "SSC CGL 2026 Notification Out For 14582 Vacancies")).toBeGreaterThan(0.55);
    expect(findMatch({ title: "SSC CGL Recruitment 2026 for 14582 Posts", vacancyCount: 14582, urls: [] }, candidates)?.candidate.id).toBe("a");
    expect(findMatch({ title: "SSC CHSL Recruitment 2026 for 3712 Posts", vacancyCount: 3712, urls: [] }, candidates)).toBeNull();
  });

  it("asks for a closer title when the vacancy counts differ", () => {
    // Identical titles still merge (the disagreement is shown to the reviewer); a looser title with a different count does not.
    expect(findMatch({ title: "Bihar Police Constable Recruitment 2026", vacancyCount: 9999, urls: [] }, [candidates[1]])?.candidate.id).toBe("b");
    expect(findMatch({ title: "Bihar Police Driver Constable Recruitment 2026", vacancyCount: 9999, urls: [] }, [candidates[1]])).toBeNull();
    expect(findMatch({ title: "Bihar Police Driver Constable Recruitment 2026", urls: [] }, [candidates[1]])?.candidate.id).toBe("b");
  });

  it("never matches across different kinds of notification", () => {
    expect(findMatch({ leadType: "result", title: "SSC CGL 2026 Notification Out For 14582 Vacancies", urls: [] }, candidates)).toBeNull();
  });
});

describe("findConflicts", () => {
  it("reports where two sites disagree and ignores formatting differences", () => {
    const conflicts = findConflicts([
      { site: "a.example", parsed: { applicationEndDate: "2026-12-15", vacancyCount: 100, notificationNumber: "SSC/01" } },
      { site: "b.example", parsed: { applicationEndDate: "2026-12-20", vacancyCount: 100, notificationNumber: "ssc 01" } }
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ field: "applicationEndDate", label: "Last date" });
    expect(conflicts[0].values.map((value) => value.site)).toEqual(["a.example", "b.example"]);
  });
});

describe("reading the pay", () => {
  const withText = (text: string, tables: string[][][] = []): CapturePayload => ({ mode: "page", url: "https://rival-jobs.example/court-2026", title: "District Court Recruitment 2026 for 86 Posts", text, links: [], tables });

  it("reads the Salary row of the overview table", () => {
    const text = ["Company Name\tBengaluru Rural District Court", "No of Posts\t86", "Salary\tRs. 27,000 - Rs. 67,600 per month (pay scale varies by post)", "Qualification\tSSLC"].join("\n");
    expect(parseCapture(withText(text), context).salaryText).toBe("Rs. 27,000 - Rs. 67,600 per month (pay scale varies by post)");
    expect(parseCapture(withText("", [[["Salary", "Rs. 27,000 - Rs. 67,600 per month (pay scale varies by post)"]]]), context).salaryText).toContain("27,000");
  });

  it("reads a pay line, a sentence naming the pay, and the amounts listed under a Salary heading", () => {
    expect(parseCapture(withText("Pay Scale : Level 6 (Rs. 35,400 - 1,12,400)"), context).salaryText).toBe("Level 6 (Rs. 35,400 - 1,12,400)");
    expect(parseCapture(withText("Applications are online only. The pay scales range from Rs. 27,000 to Rs. 67,600 per month, depending on the post. Apply early."), context).salaryText).toBe("Rs. 27,000 to Rs. 67,600 per month");
    const listed = ["Salary/Stipend", "Selected candidates will be paid the following pay scales:", "Typist: Rs. 34,100 - 67,600 (initial pay Rs. 34,100 per month)", "Peon: Rs. 27,000 - 46,675 (initial pay Rs. 27,000 per month)", "How to Apply"].join("\n");
    expect(parseCapture(withText(listed), context).salaryText).toBe("Rs. 27,000 - Rs. 67,600 per month (varies by post)");
  });

  it("does not take a salary from words alone, or from fees and dates", () => {
    expect(parseCapture(withText("Salary\tAs per rules\nApplication Fee\tRs. 500\nPayment Mode\tOnline"), context).salaryText).toBeUndefined();
    expect(parseCapture(withText("Last date 15/12/2026"), context).salaryText).toBeUndefined();
  });

  it("keeps the lowest and highest amount beside the text", () => {
    expect(salaryBounds("Rs. 27,000 - Rs. 67,600 per month")).toEqual({ min: 27000, max: 67600 });
    expect(salaryBounds("Level 6 (Rs. 35,400 - 1,12,400)")).toEqual({ min: 35400, max: 112400 });
    expect(salaryBounds("Pay Level 4")).toBeUndefined();
    expect(salaryBounds("2026")).toBeUndefined();
  });
});

describe("a qualification that names its posts", () => {
  it("gives each post the qualification written for it", () => {
    const payload: CapturePayload = {
      mode: "page",
      url: "https://rival-jobs.example/court-posts-2026",
      title: "District Court Recruitment 2026 for 86 Posts",
      text: "Qualification\tII PUC/3-year Diploma in Commercial Practice with typewriting (Typist, Typist-Copyist); SSLC (Process Server, Peon)",
      links: [],
      tables: [[["Post Name", "Vacancies"], ["Typist", "8"], ["Typist-Copyist", "18"], ["Process Server", "24"], ["Peon", "36"]]]
    };
    const posts = parseCapture(payload, context).posts;
    expect(posts.map((post) => [post.title, post.qualificationText])).toEqual([
      ["Typist", "II PUC/3-year Diploma in Commercial Practice with typewriting"],
      ["Typist-Copyist", "II PUC/3-year Diploma in Commercial Practice with typewriting"],
      ["Process Server", "SSLC"],
      ["Peon", "SSLC"]
    ]);
  });
});

describe("a listing laid out as a table", () => {
  const row = (date: string, board: string, post: string, qualification: string, advt: string, last: string) => `${date} | ${board} | ${post} | ${qualification} | ${advt} | ${last} | Get Details`;
  const listing: CapturePayload = {
    mode: "list",
    url: "https://www.rival-jobs.example/latest-notifications/",
    title: "Latest notifications",
    text: "",
    tables: [],
    links: [
      { href: "https://www.rival-jobs.example/articles/nainital-bank-hr-advisor-3077747", text: "Get Details", context: row("02/11/2026", "Nainital Bank", "HR Advisor – 1 Posts", "Retired Staff", "–", "07-11-2026") },
      { href: "https://www.rival-jobs.example/articles/becil-data-entry-operator-3077702", text: "Get Details", context: row("31/10/2026", "BECIL", "Data Entry Operator – 23 Posts", "12TH", "566", "17-11-2026") },
      { href: "https://www.rival-jobs.example/articles/kpsc-vet-cutoff-3070001", text: "View", context: "18/07/2026 | KPSC | Veterinary Officer Cut Off Marks 2024 | | | | View" },
      { href: "https://www.rival-jobs.example/about", text: "Get Details", context: "" }
    ]
  };

  it("takes the title, the date it was posted and the last date from the row", () => {
    expect(parseListing(listing)).toEqual([
      { title: "Nainital Bank HR Advisor – 1 Posts", url: "https://www.rival-jobs.example/articles/nainital-bank-hr-advisor-3077747", leadType: "recruitment", postedOn: "2026-11-02", lastDate: "2026-11-07" },
      { title: "BECIL Data Entry Operator – 23 Posts", url: "https://www.rival-jobs.example/articles/becil-data-entry-operator-3077702", leadType: "recruitment", postedOn: "2026-10-31", lastDate: "2026-11-17" }
    ]);
  });
});

describe("what changed on a notification's page", () => {
  it("lists a revised last date or vacancy count and ignores what was never read before", async () => {
    const { diffParsed } = await import("@/lib/ingest/changes");
    const before = { applicationEndDate: "2026-11-15", vacancyCount: 100, notificationNumber: "A/1", posts: [] };
    expect(diffParsed(before, { applicationEndDate: "2026-11-22", vacancyCount: 100, notificationNumber: "a/1", salaryText: "Rs. 30,000" })).toEqual([{ field: "applicationEndDate", label: "Last date", from: "2026-11-15", to: "2026-11-22" }]);
    expect(diffParsed(undefined, { applicationEndDate: "2026-11-22" })).toEqual([]);
    expect(diffParsed({ posts: [] }, { applicationEndDate: "2026-11-22" })).toEqual([]);
  });
});

describe("listing menus", () => {
  it("does not turn a category link or a menu item into a notification", () => {
    const entries = parseListing({
      mode: "list",
      url: "https://www.rival-jobs.example/",
      title: "Home",
      text: "",
      tables: [],
      links: [
        { href: "https://www.rival-jobs.example/latest-notifications/", text: "Latest Notifications" },
        { href: "https://www.rival-jobs.example/bank-jobs/", text: "Bank Jobs Recruitment 2026" },
        { href: "https://www.rival-jobs.example/articles/kea-fda-sda-online-form-2026-3077000", text: "KEA FDA SDA Online Form 2026 (5,431 Vacancy)" }
      ]
    });
    expect(entries.map((entry) => entry.title)).toEqual(["KEA FDA SDA Online Form 2026 (5,431 Vacancy)"]);
  });
});

describe("a total row that is narrower than the table", () => {
  it("reads 'Total | 7,268' as the total and not as a post called 7,268", () => {
    const payload: CapturePayload = {
      mode: "page",
      url: "https://rival-jobs.example/odisha-police-constable-2026",
      title: "Odisha Police Constable Recruitment 2026",
      text: "Total Vacancies\t7,268",
      links: [],
      tables: [[["S. No.", "Post Name", "No. of Posts"], ["1", "Constable (Civil)", "4,219"], ["2", "Constable (Communication)", "300"], ["3", "Traffic Constable", "4"], ["Total", "7,268"]]]
    };
    const parsed = parseCapture(payload, context);
    expect(parsed.posts.map((post) => [post.title, post.vacancyCount])).toEqual([["Constable (Civil)", 4219], ["Constable (Communication)", 300], ["Traffic Constable", 4]]);
    expect(parsed.vacancyCount).toBe(7268);
  });
});
