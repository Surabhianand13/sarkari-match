import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FactMonth } from "@/components/fact-month";
import { isTimeSensitive, monthYearLabel, parseFactMonth } from "@/lib/freshness";

const today = new Date("2026-11-02T10:00:00Z");

describe("dating current-affairs questions by month", () => {
  it("spots topics whose answers depend on when they were asked", () => {
    expect(isTimeSensitive("General Awareness", "Current Affairs")).toBe(true);
    expect(isTimeSensitive("General Awareness", "Awards and Honours")).toBe(true);
    expect(isTimeSensitive("Current Affairs", null)).toBe(true);
    expect(isTimeSensitive("General Awareness", "History")).toBe(false);
    expect(isTimeSensitive("Quantitative Aptitude", "Percentage")).toBe(false);
  });

  it("reads the month a writer gives, as a month or a full date, and the source it cites", () => {
    const titles = ["Union Budget 2026 notes", "Sports roundup"];
    expect(parseFactMonth({ source: "union budget 2026 notes", as_of: "2026-02" }, titles, today)).toEqual({ factAsOf: "2026-02-01", sourceTitle: "Union Budget 2026 notes" });
    expect(parseFactMonth({ source: "Sports roundup", as_of: "2026-10-20" }, titles, today).factAsOf).toBe("2026-10-01");
    expect(parseFactMonth({ source: "Sports roundup", as_of: "2026-11" }, titles, today).factAsOf).toBe("2026-11-01");
  });

  it("ignores a month that is not real, is in the future, or is long ago, and a source that was never uploaded", () => {
    const titles = ["Sports roundup"];
    expect(parseFactMonth({ source: "A note nobody uploaded", as_of: "2026-13" }, titles, today)).toEqual({ factAsOf: null, sourceTitle: null });
    expect(parseFactMonth({ source: "Sports roundup", as_of: "2027-06" }, titles, today).factAsOf).toBeNull();
    expect(parseFactMonth({ source: "Sports roundup", as_of: "1990-06" }, titles, today).factAsOf).toBeNull();
    expect(parseFactMonth({ source: "Sports roundup", as_of: "last month" }, titles, today).factAsOf).toBeNull();
    expect(parseFactMonth({}, titles, today)).toEqual({ factAsOf: null, sourceTitle: null });
  });

  it("writes the month and year in English and Hindi", () => {
    expect(monthYearLabel("2026-10-01")).toBe("October 2026");
    expect(monthYearLabel("2026-10-01", "hi")).toBe("अक्टूबर 2026");
    expect(monthYearLabel("2026-03-01T00:00:00.000Z")).toBe("March 2026");
    expect(monthYearLabel(null)).toBeNull();
    expect(monthYearLabel("not a date")).toBeNull();
  });

  it("shows the month above a question, and nothing for a question without one", () => {
    expect(renderToStaticMarkup(createElement(FactMonth, { value: "2026-10-01" }))).toContain("Current affairs · October 2026");
    expect(renderToStaticMarkup(createElement(FactMonth, { value: "2026-10-01", lang: "hi" }))).toContain("समसामयिकी · अक्टूबर 2026");
    expect(renderToStaticMarkup(createElement(FactMonth, { value: null }))).toBe("");
  });
});
