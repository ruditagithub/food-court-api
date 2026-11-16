import { describe, expect, it } from "bun:test";
import {
  tenants,
  tenantBalanceLogs,
  withdrawalRequests,
  foodCourts,
  foodCourtWithdrawals,
  foodCourtBalanceLogs,
} from "../db/schema";

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

  it("should have balance and bank fields on foodCourts table", () => {
    expect(foodCourts.balance).toBeDefined();
    expect(foodCourts.bankName).toBeDefined();
    expect(foodCourts.bankAccountNumber).toBeDefined();
    expect(foodCourts.bankAccountHolder).toBeDefined();
  });

  it("should define foodCourtWithdrawals table with correct columns", () => {
    expect(foodCourtWithdrawals).toBeDefined();
    expect(foodCourtWithdrawals.foodCourtId).toBeDefined();
    expect(foodCourtWithdrawals.amount).toBeDefined();
    expect(foodCourtWithdrawals.paymentMethod).toBeDefined();
    expect(foodCourtWithdrawals.bankName).toBeDefined();
    expect(foodCourtWithdrawals.bankAccountNumber).toBeDefined();
    expect(foodCourtWithdrawals.bankAccountHolder).toBeDefined();
    expect(foodCourtWithdrawals.status).toBeDefined();
    expect(foodCourtWithdrawals.proofReceiptUrl).toBeDefined();
    expect(foodCourtWithdrawals.transferReference).toBeDefined();
  });

  it("should define foodCourtBalanceLogs table with correct columns", () => {
    expect(foodCourtBalanceLogs).toBeDefined();
    expect(foodCourtBalanceLogs.foodCourtId).toBeDefined();
    expect(foodCourtBalanceLogs.orderId).toBeDefined();
    expect(foodCourtBalanceLogs.withdrawalId).toBeDefined();
    expect(foodCourtBalanceLogs.type).toBeDefined();
    expect(foodCourtBalanceLogs.subtotalAmount).toBeDefined();
    expect(foodCourtBalanceLogs.serviceFee).toBeDefined();
    expect(foodCourtBalanceLogs.taxAmount).toBeDefined();
    expect(foodCourtBalanceLogs.platformFee).toBeDefined();
    expect(foodCourtBalanceLogs.netAmount).toBeDefined();
    expect(foodCourtBalanceLogs.balanceAfter).toBeDefined();
  });

  it("should use bigint (number mode) for cumulative wallet balances and ledger amounts", () => {
    expect(foodCourts.balance.columnType).toBe("MySqlBigInt53");
    expect(foodCourts.balance.dataType).toBe("number");
    expect(tenants.balance.columnType).toBe("MySqlBigInt53");
    expect(tenants.balance.dataType).toBe("number");
    expect(tenantBalanceLogs.grossAmount.columnType).toBe("MySqlBigInt53");
    expect(tenantBalanceLogs.platformFee.columnType).toBe("MySqlBigInt53");
    expect(tenantBalanceLogs.netAmount.columnType).toBe("MySqlBigInt53");
    expect(tenantBalanceLogs.balanceAfter.columnType).toBe("MySqlBigInt53");
    expect(foodCourtBalanceLogs.subtotalAmount.columnType).toBe("MySqlBigInt53");
    expect(foodCourtBalanceLogs.serviceFee.columnType).toBe("MySqlBigInt53");
    expect(foodCourtBalanceLogs.taxAmount.columnType).toBe("MySqlBigInt53");
    expect(foodCourtBalanceLogs.platformFee.columnType).toBe("MySqlBigInt53");
    expect(foodCourtBalanceLogs.netAmount.columnType).toBe("MySqlBigInt53");
    expect(foodCourtBalanceLogs.balanceAfter.columnType).toBe("MySqlBigInt53");
    expect(withdrawalRequests.amount.columnType).toBe("MySqlBigInt53");
    expect(foodCourtWithdrawals.amount.columnType).toBe("MySqlBigInt53");
  });
});

