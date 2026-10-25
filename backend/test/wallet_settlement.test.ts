import { describe, expect, it } from "bun:test";
import { calculateSettlement } from "../modules/tenants/settlement";

describe("calculateSettlement", () => {
  it("should deduct exactly 1% platform fee and compute net amount", () => {
    const gross = 100000;
    const { platformFee, netAmount } = calculateSettlement(gross);
    expect(platformFee).toBe(1000);
    expect(netAmount).toBe(99000);
  });

  it("should handle rounded odd numbers correctly", () => {
    const gross = 25550;
    const { platformFee, netAmount } = calculateSettlement(gross);
    expect(platformFee).toBe(256);
    expect(netAmount).toBe(25294);
  });
});
