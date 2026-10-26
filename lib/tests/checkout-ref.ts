import { SignJWT, jwtVerify } from "jose";

// A short-lived signed reference the payment page sends back with the payment, so it never needs the user's email in a URL.
// It carries what was quoted (product, target and amount), so the grant call can check the payment matches the quote.
export type CheckoutRef = { userId: string; product: "pass" | "guide"; targetId: string; amountPaise: number };

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
  return new TextEncoder().encode(secret ?? "dev-only-secret-change-me-dev-only-secret");
}

export async function signCheckoutRef(ref: CheckoutRef) {
  return new SignJWT({ product: ref.product, target: ref.targetId, amount: ref.amountPaise }).setProtectedHeader({ alg: "HS256" }).setSubject(ref.userId).setAudience("checkout").setIssuedAt().setExpirationTime("2h").sign(key());
}

export async function verifyCheckoutRef(token: string): Promise<CheckoutRef | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: "checkout" });
    if (typeof payload.sub !== "string" || typeof payload.target !== "string" || (payload.product !== "pass" && payload.product !== "guide") || typeof payload.amount !== "number") return null;
    return { userId: payload.sub, product: payload.product, targetId: payload.target, amountPaise: payload.amount };
  } catch {
    return null;
  }
}
