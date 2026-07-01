import { describe, expect, it } from "vitest";
import { createWhatsAppProvider, isWhatsAppEnabled } from "@/lib/whatsapp/provider";

describe("whatsapp provider", () => {
  it("uses a safe development provider by default", async () => {
    const provider = createWhatsAppProvider();
    const result = await provider.sendDeadlineReminder({ to: "+910000000000", jobTitle: "Demo Job", lastDate: "2026-08-15", officialUrl: "https://example.com" });
    expect(result.skipped).toBe(true);
  });

  it("is feature-flagged", () => {
    expect(isWhatsAppEnabled({ NEXT_PUBLIC_ENABLE_WHATSAPP: "true" })).toBe(true);
    expect(isWhatsAppEnabled({ NEXT_PUBLIC_ENABLE_WHATSAPP: "false" })).toBe(false);
  });
});
