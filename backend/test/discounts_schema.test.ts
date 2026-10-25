import { describe, expect, it } from "bun:test";
import { discounts, orders, paymentGroups } from "../db/schema";

describe("Discounts Database Schema", () => {
  it("should have discounts table with proper fields", async () => {
    expect(discounts).toBeDefined();
    expect(discounts.foodCourtId).toBeDefined();
    expect(discounts.tenantId).toBeDefined();
    expect(discounts.code).toBeDefined();
    expect(discounts.isPublic).toBeDefined();
    expect(discounts.maxDiscountAmount).toBeDefined();
    expect(discounts.minOrderAmount).toBeDefined();
    expect(orders.discountId).toBeDefined();
    expect(paymentGroups.discountAmount).toBeDefined();
  });
});
