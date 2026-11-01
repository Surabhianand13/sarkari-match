import { describe, expect, it } from "vitest";
import { addMonths, freshnessState, isTimeSensitive, parseFreshness } from "@/lib/freshness";

const today = new Date("2026-11-01T10:00:00Z");

describe("dating questions that can go out of date", () => {
  it("spots topics whose answers change", () => {
    expect(isTimeSensitive("General Awareness", "Current Affairs")).toBe(true);
    expect(isTimeSensitive("General Awareness", "Awards and Honours")).toBe(true);
    expect(isTimeSensitive("Current Affairs", null)).toBe(true);
    expect(isTimeSensitive("General Awareness", "History")).toBe(false);
    expect(isTimeSensitive("Quantitative Aptitude", "Percentage")).toBe(false);
  });

  it("adds months, including past the end of a month", () => {
    expect(addMonths("2026-03-15", 12)).toBe("2027-03-15");
    expect(addMonths("2026-10-31", 6)).toBe("2027-05-01");
  });

  it("reads the writer's dating, keeping only real dates and known sources", () => {
    const titles = ["Union Budget 2026 notes", "Sports roundup"];
    expect(parseFreshness({ source: "union budget 2026 notes", as_of: "2026-02-01", shelf_life_months: 12 }, titles, today)).toEqual({ factAsOf: "2026-02-01", validUntil: "2027-02-01", sourceTitle: "Union Budget 2026 notes" });
    expect(parseFreshness({ source: "Sports roundup", as_of: "2026-06-30" }, titles, today).validUntil).toBe("2027-06-30");
    // Zero months means it never changes, so it never expires.
    expect(parseFreshness({ source: "Sports roundup", as_of: "2026-06-30", shelf_life_months: 0 }, titles, today).validUntil).toBeNull();
    // Nothing invented is accepted.
    expect(parseFreshness({ source: "A note nobody uploaded", as_of: "2026-13-45" }, titles, today)).toEqual({ factAsOf: null, validUntil: null, sourceTitle: null });
    expect(parseFreshness({ source: "Sports roundup", as_of: "2031-01-01" }, titles, today).factAsOf).toBeNull();
    expect(parseFreshness({ source: "Sports roundup", as_of: "1990-01-01" }, titles, today).factAsOf).toBeNull();
    expect(parseFreshness({ as_of: "2026-06-30", shelf_life_months: 500 }, titles, today).validUntil).toBe("2027-06-30");
  });

  it("says whether a question is expired, about to expire, fine, or never expires", () => {
    expect(freshnessState("2026-10-31", today)).toBe("expired");
    expect(freshnessState("2026-11-01", today)).toBe("soon");
    expect(freshnessState("2026-11-30", today)).toBe("soon");
    expect(freshnessState("2026-12-15", today)).toBe("fresh");
    expect(freshnessState(null, today)).toBe("none");
  });
});
