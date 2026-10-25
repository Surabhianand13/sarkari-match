import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession, verifySession } from "@/lib/auth/session";

describe("session tokens", () => {
  it("round-trips the user id and email", async () => {
    const token = await signSession({ sub: "user-1", email: "a@example.com" });
    expect(await verifySession(token)).toEqual({ sub: "user-1", email: "a@example.com" });
  });

  it("rejects tampered, empty and wrongly signed tokens", async () => {
    const token = await signSession({ sub: "user-1", email: "a@example.com" });
    expect(await verifySession(token.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySession("")).toBeNull();
    expect(await verifySession(undefined)).toBeNull();
    const forged = await new SignJWT({ email: "a@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("a-completely-different-secret-value-1234"));
    expect(await verifySession(forged)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const expired = await new SignJWT({ email: "a@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode("dev-only-secret-change-me-dev-only-secret"));
    expect(await verifySession(expired)).toBeNull();
  });
});

describe("passwords", () => {
  it("verifies the right password and rejects others", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(hash).not.toContain("correct-horse");
    expect(await verifyPassword("correct-horse-battery", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
