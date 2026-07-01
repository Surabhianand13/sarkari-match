import { describe, expect, it } from "vitest";
import { applicationInputSchema, nextActionUrgency, statusLabel } from "@/lib/applications/tracker";

describe("application tracker", () => {
  it("validates application input", () => {
    const parsed = applicationInputSchema.safeParse({ postId: "post_1", status: "applied", applicationNumber: "ABC123", appliedAt: "2026-06-22" });
    expect(parsed.success).toBe(true);
  });

  it("computes next-action urgency", () => {
    expect(nextActionUrgency("2026-06-23", new Date("2026-06-22T00:00:00Z"))).toBe("soon");
    expect(nextActionUrgency("2026-07-10", new Date("2026-06-22T00:00:00Z"))).toBe("scheduled");
  });

  it("formats status labels", () => {
    expect(statusLabel("application_started")).toBe("Application Started");
  });
});
