import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { turnstileEnabled, verifyTurnstile } from "@/lib/auth/turnstile";

describe("turnstile", () => {
  beforeEach(() => {
    delete process.env.TURNSTILE_SECRET_KEY;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  it("lets everything through when it is not configured", async () => {
    expect(turnstileEnabled()).toBe(false);
    expect(await verifyTurnstile(undefined, "1.1.1.1")).toBe(true);
  });

  it("rejects a missing token and accepts only a successful Cloudflare answer", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    expect(await verifyTurnstile(undefined, "1.1.1.1")).toBe(false);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    expect(await verifyTurnstile("good-token", "1.1.1.1")).toBe(true);
    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as URLSearchParams;
    expect(body.get("secret")).toBe("test-secret");
    expect(body.get("response")).toBe("good-token");
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 200 }));
    expect(await verifyTurnstile("bad-token", "1.1.1.1")).toBe(false);
  });

  it("fails closed when Cloudflare cannot be reached", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network down"));
    expect(await verifyTurnstile("token", "1.1.1.1")).toBe(false);
  });
});
