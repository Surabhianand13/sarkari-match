import { describe, expect, it } from "vitest";
import { localizeStaticLabel, resolveLocale } from "@/lib/i18n/locales";

describe("locales", () => {
  it("falls back to English", () => {
    expect(resolveLocale("xx")).toBe("en");
  });

  it("localizes static labels", () => {
    expect(localizeStaticLabel("find_matches", "hi")).toContain("मैच");
  });
});
