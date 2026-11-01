import { describe, expect, it } from "vitest";
import { friendlyDbError } from "@/lib/admin/db";

describe("friendlyDbError", () => {
  it("explains common database errors in plain words", () => {
    expect(friendlyDbError({ code: "23505" })).toMatch(/already exists/);
    expect(friendlyDbError(new Error("Something specific"))).toBe("Something specific");
  });

  it("lets a redirect pass through instead of turning it into an error message", () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/admin/questions/x?error=Hello;307;" });
    expect(() => friendlyDbError(redirect)).toThrow(redirect);
  });
});
