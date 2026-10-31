import { describe, expect, it } from "vitest";
import { parseTopics } from "@/lib/question-factory/topics";

describe("parseTopics", () => {
  it("splits on new lines and semicolons but keeps commas inside a topic", () => {
    expect(parseTopics("Percentage\nTime, Speed and Distance; Discount")).toEqual(["Percentage", "Time, Speed and Distance", "Discount"]);
  });

  it("trims spaces, drops blanks and repeats (ignoring case)", () => {
    expect(parseTopics("  Percentage  \n\npercentage\n  Time   and  Work ")).toEqual(["Percentage", "Time and Work"]);
  });

  it("returns nothing for an empty box so the whole subject is covered", () => {
    expect(parseTopics("  \n ")).toEqual([]);
  });
});
