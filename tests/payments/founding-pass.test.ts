import { describe, expect, it } from "vitest";
import { canReserveFoundingPass, remainingFoundingSlots } from "@/lib/payments/founding-pass";

describe("founding pass reservation limits", () => {
  it("does not exceed 1000 successful and reserved slots", () => {
    expect(remainingFoundingSlots({ successfulPurchases: 999, activeReservations: 1 })).toBe(0);
    expect(canReserveFoundingPass({ successfulPurchases: 999, activeReservations: 1 })).toBe(false);
  });

  it("releases capacity when reservations expire upstream", () => {
    expect(canReserveFoundingPass({ successfulPurchases: 999, activeReservations: 0 })).toBe(true);
  });
});
