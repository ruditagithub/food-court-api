import { describe, expect, it } from "bun:test";
import { app } from "../index";
import { RequestWithdrawalDTO, ProcessWithdrawalDTO, RejectWithdrawalDTO } from "../modules/tenants/model";
import { Value } from "@sinclair/typebox/value";

describe("Tenant Wallet & Withdrawal Unit Tests", () => {
  it("should validate RequestWithdrawalDTO schema rules", () => {
    // Valid Cash
    const validCash = {
      amount: 50000,
      paymentMethod: "CASH",
    };
    expect(Value.Check(RequestWithdrawalDTO, validCash)).toBe(true);

    // Valid Transfer
    const validTransfer = {
      amount: 100000,
      paymentMethod: "TRANSFER",
      bankName: "BCA",
      bankAccountNumber: "1234567890",
      bankAccountHolder: "Budi Santoso",
    };
    expect(Value.Check(RequestWithdrawalDTO, validTransfer)).toBe(true);

    // Below minimum 10000
    const invalidAmount = {
      amount: 5000,
      paymentMethod: "CASH",
    };
    expect(Value.Check(RequestWithdrawalDTO, invalidAmount)).toBe(false);

    // Invalid method
    const invalidMethod = {
      amount: 25000,
      paymentMethod: "CRYPTO",
    };
    expect(Value.Check(RequestWithdrawalDTO, invalidMethod)).toBe(false);
  });

  it("should validate ProcessWithdrawalDTO and RejectWithdrawalDTO schemas", () => {
    const validProcess = {
      paymentMethod: "TRANSFER",
      proofReceiptUrl: "https://example.com/receipt.jpg",
      transferReference: "TRX-998822",
      adminNotes: "Sudah ditransfer via m-BCA",
    };
    expect(Value.Check(ProcessWithdrawalDTO, validProcess)).toBe(true);

    const validReject = {
      reason: "Nomor rekening tidak terdaftar / salah nama",
    };
    expect(Value.Check(RejectWithdrawalDTO, validReject)).toBe(true);

    const invalidReject = {
      reason: "x", // too short
    };
    expect(Value.Check(RejectWithdrawalDTO, invalidReject)).toBe(false);
  });

  it("should block unauthenticated requests to wallet and withdrawal endpoints", async () => {
    const resWallet = await app.handle(new Request("http://localhost/api/tenants/wallet"));
    expect(resWallet.status).toBe(401);

    const resWithdrawals = await app.handle(new Request("http://localhost/api/tenants/withdrawals"));
    expect(resWithdrawals.status).toBe(401);

    const resAdminWithdrawals = await app.handle(new Request("http://localhost/api/admin/withdrawals"));
    expect(resAdminWithdrawals.status).toBe(401);
  });
});
