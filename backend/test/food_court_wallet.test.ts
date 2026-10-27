import { beforeAll, describe, expect, it } from "bun:test";
import { app } from "../index";
import { db } from "../db";
import {
  foodCourts,
  foodCourtBalanceLogs,
  foodCourtWithdrawals,
  users,
  tenantBalanceLogs,
  tenants,
  diningSessions,
  orders,
  tenantOrders,
} from "../db/schema";
import { and, eq } from "drizzle-orm";
import {
  calculateSettlement,
  calculateFoodCourtSettlement,
  calculatePlatformFee,
  settleOrderTenantRevenues,
} from "../modules/tenants/settlement";

describe("Food Court Wallet, Platform Fee Reallocation, and Disbursements", () => {
  let adminToken: string;
  let managerToken: string;
  let tenantToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let testFoodCourtId: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Create and login Admin
    const adminEmail = `superadmin_${timestamp}@foodcourt.com`;
    await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Super Admin Test",
          email: adminEmail,
          password: "Password123!",
          role: "admin",
        }),
      }),
    );
    const adminLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: "Password123!",
        }),
      }),
    );
    const adminLoginJson = (await adminLoginRes.json()) as any;
    adminToken = adminLoginJson.data.token;
    adminUserId = adminLoginJson.data.user.id;

    // 2. Create and login Manager (admin-food-court)
    const managerEmail = `fcmanager_${timestamp}@foodcourt.com`;
    await app.handle(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Manager Test",
          email: managerEmail,
          password: "Password123!",
          role: "admin-food-court",
        }),
      }),
    );
    const managerLoginRes = await app.handle(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: managerEmail,
          password: "Password123!",
        }),
      }),
    );
    const managerLoginJson = (await managerLoginRes.json()) as any;
    managerToken = managerLoginJson.data.token;
    managerUserId = managerLoginJson.data.user.id;

    // 3. Register Food Court managed by this manager
    const fcRes = await app.handle(
      new Request("http://localhost/api/food-courts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          name: `Food Court Test ${timestamp}`,
          address: "Jl. Pemuda No. 123",
          phone: "081234567890",
        }),
      }),
    );
    const fcJson = (await fcRes.json()) as any;
    testFoodCourtId = fcJson.data.id;

    // Give food court initial balance of Rp 500.000 for testing
    await db
      .update(foodCourts)
      .set({
        balance: 500000,
        bankName: "BCA",
        bankAccountNumber: "8881234567",
        bankAccountHolder: "PT Food Court Sentra",
      })
      .where(eq(foodCourts.id, testFoodCourtId));
  });

  it("should calculate 100% gross to tenant and allocate net to food court", () => {
    const gross = 200000;
    const { platformFee: tenantFee, netAmount: tenantNet } = calculateSettlement(gross);
    expect(tenantFee).toBe(0);
    expect(tenantNet).toBe(200000);

    const subtotal = 200000;
    const serviceFee = 6000; // 3%
    const taxAmount = 20000; // 10%
    const { platformFee: fcAppFee, netAmount: fcNet } = calculateFoodCourtSettlement(
      subtotal,
      serviceFee,
      taxAmount,
    );
    expect(fcAppFee).toBe(2000); // 1%
    expect(fcNet).toBe(6000 + 20000 - 2000); // 24000
  });

  it("should get food court wallet summary via GET /api/admin/food-court/wallet", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/wallet", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.balance).toBe(500000);
    expect(json.data.bankInfo.bankName).toBe("BCA");
    expect(json.data.bankInfo.bankAccountNumber).toBe("8881234567");
    expect(json.data.bankInfo.bankAccountHolder).toBe("PT Food Court Sentra");
  });

  it("should reject withdrawal below Rp 50.000 minimum", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          amount: 25000,
          bankName: "BCA",
          bankAccountNumber: "8881234567",
          bankAccountHolder: "PT Food Court Sentra",
        }),
      }),
    );
    expect(res.status).toBe(422); // Validation error for minimum
  });

  it("should reject withdrawal exceeding current food court balance", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          amount: 1000000, // Exceeds 500.000
          bankName: "BCA",
          bankAccountNumber: "8881234567",
          bankAccountHolder: "PT Food Court Sentra",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.message).toContain("Saldo cabang food court tidak mencukupi");
  });

  let createdWithdrawalId: string;

  it("should successfully create food court withdrawal and immediately hold balance", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/admin/food-court/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          amount: 150000,
          bankName: "Mandiri",
          bankAccountNumber: "1440098765432",
          bankAccountHolder: "Manajemen Sentra Kuliner",
        }),
      }),
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.data.id).toBeDefined();
    expect(json.data.amount).toBe(150000);
    expect(json.data.status).toBe("PENDING");
    createdWithdrawalId = json.data.id;

    // Check that balance decreased to 350.000 (500.000 - 150.000)
    const walletRes = await app.handle(
      new Request("http://localhost/api/admin/food-court/wallet", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
      }),
    );
    const walletJson = (await walletRes.json()) as any;
    expect(walletJson.data.balance).toBe(350000);
    expect(walletJson.data.pendingWithdrawal).toBe(150000);
  });

  it("should allow Super Admin to list withdrawals and process with proof receipt", async () => {
    // List withdrawals as Super Admin
    const listRes = await app.handle(
      new Request("http://localhost/api/super-admin/withdrawals", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as any;
    const found = listJson.data.find((w: any) => w.id === createdWithdrawalId);
    expect(found).toBeDefined();

    // Process withdrawal with receipt proof
    const processRes = await app.handle(
      new Request(
        `http://localhost/api/super-admin/withdrawals/${createdWithdrawalId}/process`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            proofReceiptUrl: "/uploads/transfer_proof_fc_1.jpg",
            transferReference: "TRF-MND-9921827",
            adminNotes: "Disbursed via Mandiri Corporate",
          }),
        },
      ),
    );
    expect(processRes.status).toBe(200);
    const processJson = (await processRes.json()) as any;
    expect(processJson.data.status).toBe("PROCESSED");
    expect(processJson.data.transferReference).toBe("TRF-MND-9921827");
  });

  it("should allow manager to confirm receipt and finalize to COMPLETED", async () => {
    const confirmRes = await app.handle(
      new Request(
        `http://localhost/api/admin/food-court/withdrawals/${createdWithdrawalId}/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${managerToken}`,
          },
        },
      ),
    );
    expect(confirmRes.status).toBe(200);
    const confirmJson = (await confirmRes.json()) as any;
    expect(confirmJson.data.status).toBe("COMPLETED");

    // Check wallet stats: totalWithdrawn is now 150.000, pending is 0
    const walletRes = await app.handle(
      new Request("http://localhost/api/admin/food-court/wallet", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${managerToken}`,
        },
      }),
    );
    const walletJson = (await walletRes.json()) as any;
    expect(walletJson.data.balance).toBe(350000);
    expect(walletJson.data.totalWithdrawn).toBe(150000);
    expect(walletJson.data.pendingWithdrawal).toBe(0);
  });

  it("should refund held balance when Super Admin rejects a withdrawal", async () => {
    // 1. Create a second withdrawal for Rp 100.000
    const createRes = await app.handle(
      new Request("http://localhost/api/admin/food-court/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          amount: 100000,
          bankName: "BRI",
          bankAccountNumber: "0012398746",
          bankAccountHolder: "Sentra Kuliner",
        }),
      }),
    );
    const createJson = (await createRes.json()) as any;
    const secondWithdrawalId = createJson.data.id;

    // Balance should now be 250.000
    const walletAfterHold = await app.handle(
      new Request("http://localhost/api/admin/food-court/wallet", {
        method: "GET",
        headers: { Authorization: `Bearer ${managerToken}` },
      }),
    );
    expect(((await walletAfterHold.json()) as any).data.balance).toBe(250000);

    // 2. Super Admin rejects with reason
    const rejectRes = await app.handle(
      new Request(
        `http://localhost/api/super-admin/withdrawals/${secondWithdrawalId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            reason: "Nomor rekening tujuan tidak valid / salah digit",
          }),
        },
      ),
    );
    expect(rejectRes.status).toBe(200);
    const rejectJson = (await rejectRes.json()) as any;
    expect(rejectJson.data.status).toBe("REJECTED");

    // 3. Balance must be refunded back to 350.000
    const walletAfterRefund = await app.handle(
      new Request("http://localhost/api/admin/food-court/wallet", {
        method: "GET",
        headers: { Authorization: `Bearer ${managerToken}` },
      }),
    );
    const refundedJson = (await walletAfterRefund.json()) as any;
    expect(refundedJson.data.balance).toBe(350000);
  });

  it("should provide Super Admin platform revenue metrics", async () => {
    // Insert mock settlement log into foodCourtBalanceLogs
    await db.insert(foodCourtBalanceLogs).values({
      id: crypto.randomUUID(),
      foodCourtId: testFoodCourtId,
      type: "ORDER_SETTLEMENT",
      subtotalAmount: 500000,
      serviceFee: 15000,
      taxAmount: 50000,
      platformFee: 5000,
      netAmount: 60000,
      balanceAfter: 410000,
      description: "Test settlement for platform revenue metrics",
      createdAt: new Date(),
    });

    const res = await app.handle(
      new Request("http://localhost/api/super-admin/platform-revenue", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.totalEarnedPlatformFee).toBeGreaterThanOrEqual(5000);
    expect(json.data.totalOrdersCount).toBeGreaterThanOrEqual(1);
    expect(json.data.branchBreakdown.length).toBeGreaterThan(0);
  });

  it("should reconcile historical tenant fees and update food court absorption ledger", async () => {
    // Seed a mock tenant with a deducted fee belonging to testFoodCourtId
    const testTenant = await db.query.tenants.findFirst({
      where: eq(tenants.foodCourtId, testFoodCourtId),
    });
    const targetTenant =
      testTenant ||
      (await (async () => {
        const id = crypto.randomUUID();
        await db.insert(tenants).values({
          id,
          foodCourtId: testFoodCourtId,
          name: `Reconcile Stall ${Date.now()}`,
          slug: `reconcile-stall-${Date.now()}`,
          stallNumber: "REC-01",
          balance: 10000,
          isOpen: true,
        });
        return db.query.tenants.findFirst({ where: eq(tenants.id, id) });
      })());

    if (targetTenant) {
      const initialTenantBalance = targetTenant.balance || 0;
      const initialFcBalance =
        (await db.query.foodCourts.findFirst({ where: eq(foodCourts.id, testFoodCourtId) }))
          ?.balance || 0;

      await db.insert(tenantBalanceLogs).values({
        id: crypto.randomUUID(),
        tenantId: targetTenant.id,
        type: "ORDER_REVENUE",
        grossAmount: 100000,
        platformFee: 1000, // Historical deduction to reimburse
        netAmount: 99000,
        balanceAfter: initialTenantBalance,
        description: "Mock past order with 1% deduction",
        createdAt: new Date(),
      });

      const res = await app.handle(
        new Request("http://localhost/api/admin/system/reconcile-tenant-fees", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      );
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.reconciledCount).toBeGreaterThanOrEqual(1);
      expect(json.totalReimbursedAmount).toBeGreaterThanOrEqual(1000);

      // Verify tenant balance increased by at least 1000
      const refreshedTenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, targetTenant.id),
      });
      expect(refreshedTenant?.balance).toBe(initialTenantBalance + 1000);

      // Verify food court balance absorbed the fee deduction
      const refreshedFc = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.id, testFoodCourtId),
      });
      expect(refreshedFc?.balance).toBe(initialFcBalance - 1000);

      // Verify food court balance log contains ADJUSTMENT
      const fcAdjustmentLog = await db.query.foodCourtBalanceLogs.findFirst({
        where: and(
          eq(foodCourtBalanceLogs.foodCourtId, testFoodCourtId),
          eq(foodCourtBalanceLogs.type, "ADJUSTMENT"),
        ),
      });
      expect(fcAdjustmentLog).toBeDefined();
      expect(fcAdjustmentLog?.platformFee).toBe(1000);
      expect(fcAdjustmentLog?.netAmount).toBe(-1000);
    }
  });

  it("should settle order tenant revenue end-to-end: 100% gross to tenant and net to food court", async () => {
    // 1. Create a dining session
    const sessionId = crypto.randomUUID();
    await db.insert(diningSessions).values({
      id: sessionId,
      foodCourtId: testFoodCourtId,
      sessionCode: `SESS-${Date.now()}`,
      status: "ACTIVE",
    });

    // 2. Create tenant
    const tId = crypto.randomUUID();
    await db.insert(tenants).values({
      id: tId,
      foodCourtId: testFoodCourtId,
      name: `Settlement Test Stall ${Date.now()}`,
      slug: `settlement-stall-${Date.now()}`,
      stallNumber: "ST-99",
      balance: 50000,
      isOpen: true,
    });

    // 3. Create master order and sub-order
    const orderId = crypto.randomUUID();
    const orderNumber = `ORD-SETTLE-${Date.now()}`;
    await db.insert(orders).values({
      id: orderId,
      sessionId,
      orderNumber,
      subtotal: 100000, // Rp 100.000 spend
      serviceFee: 3000, // 3%
      taxAmount: 10000, // 10%
      totalAmount: 113000,
      paymentStatus: "PAID",
      orderStatus: "COMPLETED",
    });

    const tenantOrderId = crypto.randomUUID();
    await db.insert(tenantOrders).values({
      id: tenantOrderId,
      orderId,
      tenantId: tId,
      subtotal: 100000,
      status: "COMPLETED",
    });

    const fcBefore =
      (await db.query.foodCourts.findFirst({ where: eq(foodCourts.id, testFoodCourtId) }))
        ?.balance || 0;

    // 4. Execute settlement
    await settleOrderTenantRevenues(orderId);

    // Verify tenant balance: initial 50.000 + 100.000 gross = 150.000 (0% fee)
    const refreshedTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tId),
    });
    expect(refreshedTenant?.balance).toBe(150000);

    const tenantLog = await db.query.tenantBalanceLogs.findFirst({
      where: and(
        eq(tenantBalanceLogs.tenantOrderId, tenantOrderId),
        eq(tenantBalanceLogs.type, "ORDER_REVENUE"),
      ),
    });
    expect(tenantLog).toBeDefined();
    expect(tenantLog?.grossAmount).toBe(100000);
    expect(tenantLog?.platformFee).toBe(0);
    expect(tenantLog?.netAmount).toBe(100000);
    expect(tenantLog?.balanceAfter).toBe(150000);

    // Verify Food Court balance: fcBefore + 12.000 (3000 service + 10000 tax - 1000 platform fee)
    const refreshedFc = await db.query.foodCourts.findFirst({
      where: eq(foodCourts.id, testFoodCourtId),
    });
    expect(refreshedFc?.balance).toBe(fcBefore + 12000);

    const fcLog = await db.query.foodCourtBalanceLogs.findFirst({
      where: and(
        eq(foodCourtBalanceLogs.orderId, orderId),
        eq(foodCourtBalanceLogs.type, "ORDER_SETTLEMENT"),
      ),
    });
    expect(fcLog).toBeDefined();
    expect(fcLog?.subtotalAmount).toBe(100000);
    expect(fcLog?.serviceFee).toBe(3000);
    expect(fcLog?.taxAmount).toBe(10000);
    expect(fcLog?.platformFee).toBe(1000);
    expect(fcLog?.netAmount).toBe(12000);
    expect(fcLog?.balanceAfter).toBe(fcBefore + 12000);

    // 5. Test settlement idempotency: call again, balances should NOT double-increment
    await settleOrderTenantRevenues(orderId);

    const tenantAfterSecondCall = await db.query.tenants.findFirst({
      where: eq(tenants.id, tId),
    });
    expect(tenantAfterSecondCall?.balance).toBe(150000);

    const fcAfterSecondCall = await db.query.foodCourts.findFirst({
      where: eq(foodCourts.id, testFoodCourtId),
    });
    expect(fcAfterSecondCall?.balance).toBe(fcBefore + 12000);
  });

  it("should prevent race condition / double-withdrawal using atomic row locking", async () => {
    // Set food court balance to exactly 80.000
    await db
      .update(foodCourts)
      .set({ balance: 80000 })
      .where(eq(foodCourts.id, testFoodCourtId));

    // Send two concurrent withdrawal requests for 50.000 each (total 100.000 > 80.000)
    const request1 = app.handle(
      new Request("http://localhost/api/admin/food-court/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          amount: 50000,
          bankName: "BCA",
          bankAccountNumber: "12345678",
          bankAccountHolder: "Pengelola Sentra",
        }),
      }),
    );

    const request2 = app.handle(
      new Request("http://localhost/api/admin/food-court/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          amount: 50000,
          bankName: "BCA",
          bankAccountNumber: "12345678",
          bankAccountHolder: "Pengelola Sentra",
        }),
      }),
    );

    const [res1, res2] = await Promise.all([request1, request2]);
    const statuses = [res1.status, res2.status].sort();

    // Exactly one must succeed (201) and the second must be rejected (400) due to atomic lock
    expect(statuses).toEqual([201, 400]);

    // Remaining balance must be 30.000 (80.000 - 50.000)
    const finalFc = await db.query.foodCourts.findFirst({
      where: eq(foodCourts.id, testFoodCourtId),
    });
    expect(finalFc?.balance).toBe(30000);
  });

  it("should record WITHDRAWAL_COMPLETED ledger log when Super Admin directly completes withdrawal", async () => {
    // Give food court enough balance
    await db
      .update(foodCourts)
      .set({ balance: 100000 })
      .where(eq(foodCourts.id, testFoodCourtId));

    // 1. Create withdrawal for 50.000
    const createRes = await app.handle(
      new Request("http://localhost/api/admin/food-court/withdrawals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`,
        },
        body: JSON.stringify({
          amount: 50000,
          bankName: "BNI",
          bankAccountNumber: "0987654321",
          bankAccountHolder: "Pengelola Sentra",
        }),
      }),
    );
    expect(createRes.status).toBe(201);
    const wrId = ((await createRes.json()) as any).data.id;

    // 2. Super Admin directly completes withdrawal
    const completeRes = await app.handle(
      new Request(`http://localhost/api/super-admin/withdrawals/${wrId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }),
    );
    expect(completeRes.status).toBe(200);

    // 3. Verify that WITHDRAWAL_COMPLETED log was recorded in foodCourtBalanceLogs
    const completedLog = await db.query.foodCourtBalanceLogs.findFirst({
      where: and(
        eq(foodCourtBalanceLogs.withdrawalId, wrId),
        eq(foodCourtBalanceLogs.type, "WITHDRAWAL_COMPLETED"),
      ),
    });
    expect(completedLog).toBeDefined();
    expect(completedLog?.netAmount).toBe(0);
    expect(completedLog?.balanceAfter).toBe(50000);
  });
});
