import { SignJWT, jwtVerify } from "jose";

// A short-lived signed reference the payment page sends back with the payment, so it never needs the user's email in a URL.
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
  return new TextEncoder().encode(secret ?? "dev-only-secret-change-me-dev-only-secret");
}

export async function signCheckoutRef(userId: string, seriesId: string) {
  return new SignJWT({ series: seriesId }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setAudience("checkout").setIssuedAt().setExpirationTime("2h").sign(key());
}

export async function verifyCheckoutRef(token: string): Promise<{ userId: string; seriesId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: "checkout" });
    if (typeof payload.sub !== "string" || typeof payload.series !== "string") return null;
    return { userId: payload.sub, seriesId: payload.series };
  } catch {
    return null;
  }
}
