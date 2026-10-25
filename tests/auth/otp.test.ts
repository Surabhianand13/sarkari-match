import { describe, expect, it } from "vitest";
import { generateOtpCode, hashOtp, otpMatches } from "@/lib/auth/otp";

describe("otp helpers", () => {
  it("generates six digit codes", () => {
    for (let i = 0; i < 50; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it("matches only the same email and code", () => {
    const stored = hashOtp("A@Example.com", "123456");
    expect(otpMatches("a@example.com", "123456", stored)).toBe(true);
    expect(otpMatches("a@example.com", "654321", stored)).toBe(false);
    expect(otpMatches("b@example.com", "123456", stored)).toBe(false);
  });
});
