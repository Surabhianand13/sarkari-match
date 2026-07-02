import { describe, expect, it } from "vitest";
import { buildWhatsAppShareUrl } from "@/lib/utils/whatsapp-share";

describe("buildWhatsAppShareUrl", () => {
  it("percent-encodes the shared text into a wa.me link", () => {
    const url = buildWhatsAppShareUrl("Check this out: https://example.com/jobs/demo");
    expect(url).toBe("https://wa.me/?text=Check%20this%20out%3A%20https%3A%2F%2Fexample.com%2Fjobs%2Fdemo");
  });
});
