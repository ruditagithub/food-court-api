import { describe, expect, it } from "bun:test";
import {
  calculateSettlement,
  calculatePlatformFee,
  calculateFoodCourtSettlement,
} from "../modules/tenants/settlement";

describe("calculateSettlement (Tenant 100% Gross Reallocation)", () => {
  it("should allocate 100% gross to tenant without 1% fee deduction", () => {
    const gross = 100000;
    const { platformFee, netAmount } = calculateSettlement(gross);
    expect(platformFee).toBe(0);
    expect(netAmount).toBe(100000);
  });

  it("should keep full amount for odd gross amounts without deduction", () => {
    const gross = 25550;
    const { platformFee, netAmount } = calculateSettlement(gross);
    expect(platformFee).toBe(0);
    expect(netAmount).toBe(25550);
  });

  it("should calculate 1% platform fee for food court absorption", () => {
    expect(calculatePlatformFee(100000)).toBe(1000);
    expect(calculatePlatformFee(25550)).toBe(256);
  });

  it("should calculate food court settlement net (serviceFee + taxAmount - platformFee)", () => {
    const subtotal = 100000;
    const serviceFee = 3000; // 3%
    const taxAmount = 10000; // 10%
    const { platformFee, netAmount } = calculateFoodCourtSettlement(
      subtotal,
      serviceFee,
      taxAmount,
    );
    expect(platformFee).toBe(1000); // 1%
    expect(netAmount).toBe(3000 + 10000 - 1000); // 12000
  });
});
