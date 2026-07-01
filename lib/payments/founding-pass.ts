import crypto from "node:crypto";

export const FOUNDING_PASS_LIMIT = 1000;
export const FOUNDING_PASS_PRICE_PAISE = 9900;

export type FoundingCounter = {
  successfulPurchases: number;
  activeReservations: number;
};

export function remainingFoundingSlots(counter: FoundingCounter) {
  return Math.max(0, FOUNDING_PASS_LIMIT - counter.successfulPurchases - counter.activeReservations);
}

export function canReserveFoundingPass(counter: FoundingCounter) {
  return remainingFoundingSlots(counter) > 0;
}

export function verifyRazorpaySignature({ orderId, paymentId, signature, secret }: { orderId: string; paymentId: string; signature: string; secret: string }) {
  const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
