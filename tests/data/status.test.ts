import { describe, expect, it } from "vitest";
import { byStatus, effectiveStatus, todayInIndia } from "@/lib/data/status";

describe("effectiveStatus", () => {
  const today = "2026-11-02";

  it("moves a notification to past the day after its last date, with nobody updating it", () => {
    expect(effectiveStatus("open", { endDate: "2026-11-02" }, today)).toBe("open");
    expect(effectiveStatus("open", { endDate: "2026-11-01" }, today)).toBe("closed");
    expect(effectiveStatus("upcoming", { startDate: "2026-09-01", endDate: "2026-10-01" }, today)).toBe("closed");
  });

  it("is upcoming until the application start date, and open from it", () => {
    expect(effectiveStatus("open", { startDate: "2026-11-05", endDate: "2026-12-01" }, today)).toBe("upcoming");
    expect(effectiveStatus("upcoming", { startDate: "2026-11-02", endDate: "2026-12-01" }, today)).toBe("open");
    expect(effectiveStatus("upcoming", { endDate: "2026-12-01" }, today)).toBe("upcoming");
  });

  it("keeps a notification an editor closed, and treats a missing last date as open", () => {
    expect(effectiveStatus("closed", { endDate: "2027-01-01" }, today)).toBe("closed");
    expect(effectiveStatus("open", {}, today)).toBe("open");
  });

  it("uses the date in India", () => {
    expect(todayInIndia(Date.parse("2026-11-01T19:00:00Z"))).toBe("2026-11-02");
    expect(todayInIndia(Date.parse("2026-11-01T17:00:00Z"))).toBe("2026-11-01");
  });

  it("lists open first, then upcoming, then past, keeping the order inside each", () => {
    const jobs = [{ id: "a", applicationStatus: "closed" as const }, { id: "b", applicationStatus: "open" as const }, { id: "c", applicationStatus: "upcoming" as const }, { id: "d", applicationStatus: "open" as const }];
    expect(byStatus(jobs).map((job) => job.id)).toEqual(["b", "d", "c", "a"]);
  });
});
