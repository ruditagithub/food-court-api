import { describe, expect, it } from "bun:test";
import { tenants, tenantBalanceLogs, withdrawalRequests } from "../db/schema";

describe("Wallet & Withdrawal Schema Definitions", () => {
  it("should have balance and bank fields on tenants table", () => {
    expect(tenants.balance).toBeDefined();
    expect(tenants.bankName).toBeDefined();
    expect(tenants.bankAccountNumber).toBeDefined();
    expect(tenants.bankAccountHolder).toBeDefined();
  });

  it("should define tenantBalanceLogs table with correct columns", () => {
    expect(tenantBalanceLogs).toBeDefined();
    expect(tenantBalanceLogs.tenantId).toBeDefined();
    expect(tenantBalanceLogs.type).toBeDefined();
    expect(tenantBalanceLogs.grossAmount).toBeDefined();
    expect(tenantBalanceLogs.platformFee).toBeDefined();
    expect(tenantBalanceLogs.netAmount).toBeDefined();
    expect(tenantBalanceLogs.balanceAfter).toBeDefined();
  });

  it("should define withdrawalRequests table with correct status enum and columns", () => {
    expect(withdrawalRequests).toBeDefined();
    expect(withdrawalRequests.foodCourtId).toBeDefined();
    expect(withdrawalRequests.tenantId).toBeDefined();
    expect(withdrawalRequests.amount).toBeDefined();
    expect(withdrawalRequests.paymentMethod).toBeDefined();
    expect(withdrawalRequests.status).toBeDefined();
    expect(withdrawalRequests.proofReceiptUrl).toBeDefined();
  });
});
