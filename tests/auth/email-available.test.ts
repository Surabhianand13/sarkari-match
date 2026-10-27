import { afterEach, describe, expect, it, vi } from "vitest";
import { emailAvailable } from "@/lib/email/provider";

describe("email sign-in availability", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is off in production until an email provider is configured", () => {
    expect(emailAvailable({ NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(emailAvailable({ NODE_ENV: "production", RESEND_API_KEY: "key" } as unknown as NodeJS.ProcessEnv)).toBe(false);
    expect(emailAvailable({ NODE_ENV: "production", RESEND_API_KEY: "key", EMAIL_FROM: "Sarkari Match <hello@example.com>" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("stays usable in development, where codes are printed to the console", () => {
    expect(emailAvailable({ NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv)).toBe(true);
  });

  it("the methods route reports it", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
    const { GET } = await import("@/app/api/auth/methods/route");
    expect(await (await GET()).json()).toEqual({ otp: false });
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM", "hello@example.com");
    expect(await (await GET()).json()).toEqual({ otp: true });
  });
});
