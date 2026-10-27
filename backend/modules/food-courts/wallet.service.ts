import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../common/errors";
import { AuthUser } from "../../common/middlewares/auth";
import { db } from "../../db";
import {
  foodCourtBalanceLogs,
  foodCourts,
  foodCourtWithdrawals,
  tenantBalanceLogs,
  tenantOrders,
  tenants,
  users,
} from "../../db/schema";
import {
  ProcessFoodCourtWithdrawalDTOType,
  RequestFoodCourtWithdrawalDTOType,
} from "./model";

export class FoodCourtWalletService {
  /**
   * Resolve which food court the caller has access to
   */
  async resolveFoodCourt(user: AuthUser, foodCourtId?: string) {
    if (user.role === "admin") {
      if (foodCourtId) {
        const fc = await db.query.foodCourts.findFirst({
          where: eq(foodCourts.id, foodCourtId),
        });
        if (!fc) throw new NotFoundError("Food court not found");
        return fc;
      }
      const firstFc = await db.query.foodCourts.findFirst();
      if (!firstFc) throw new NotFoundError("No food court registered in system");
      return firstFc;
    }

    if (user.role === "admin-food-court") {
      const fc = await db.query.foodCourts.findFirst({
        where: eq(foodCourts.managerId, user.id),
      });
      if (!fc) {
        throw new NotFoundError(
          "Anda belum ditugaskan sebagai pengelola pada cabang food court manapun",
        );
      }
      if (foodCourtId && foodCourtId !== fc.id) {
        throw new ForbiddenError("Anda tidak memiliki akses ke food court ini");
      }
      return fc;
    }

    throw new ForbiddenError("Akses ditolak");
  }

  /**
   * Get wallet balance and financial statistics for a food court
   */
  async getFoodCourtWalletSummary(user: AuthUser, foodCourtId?: string) {
    const foodCourt = await this.resolveFoodCourt(user, foodCourtId);

    // Get completed withdrawals sum
    const completedList = await db.query.foodCourtWithdrawals.findMany({
      where: and(
        eq(foodCourtWithdrawals.foodCourtId, foodCourt.id),
        eq(foodCourtWithdrawals.status, "COMPLETED"),
      ),
    });
    const totalWithdrawn = completedList.reduce((acc, curr) => acc + curr.amount, 0);

    // Get pending / processed withdrawals sum
    const pendingList = await db.query.foodCourtWithdrawals.findMany({
      where: and(
        eq(foodCourtWithdrawals.foodCourtId, foodCourt.id),
        inArray(foodCourtWithdrawals.status, ["PENDING", "PROCESSED"]),
      ),
    });
    const pendingWithdrawal = pendingList.reduce((acc, curr) => acc + curr.amount, 0);

    // Get platform fee paid by this food court (including settlements and historical adjustments)
    const feeLogs = await db.query.foodCourtBalanceLogs.findMany({
      where: and(
        eq(foodCourtBalanceLogs.foodCourtId, foodCourt.id),
        sql`${foodCourtBalanceLogs.platformFee} > 0`,
      ),
    });
    const totalPlatformFeePaid = feeLogs.reduce(
      (acc, curr) => acc + (curr.platformFee || 0),
      0,
    );

    // Get recent balance logs
    const recentLogs = await db.query.foodCourtBalanceLogs.findMany({
      where: eq(foodCourtBalanceLogs.foodCourtId, foodCourt.id),
      orderBy: [desc(foodCourtBalanceLogs.createdAt)],
      limit: 50,
      with: {
        order: true,
        withdrawal: true,
      },
    });

    return {
      foodCourt: {
        id: foodCourt.id,
        name: foodCourt.name,
        slug: foodCourt.slug,
      },
      balance: foodCourt.balance || 0,
      bankInfo: {
        bankName: foodCourt.bankName,
        bankAccountNumber: foodCourt.bankAccountNumber,
        bankAccountHolder: foodCourt.bankAccountHolder,
      },
      totalWithdrawn,
      pendingWithdrawal,
      totalPlatformFeePaid,
      recentLogs,
    };
  }

  /**
   * Create a withdrawal request for the Food Court (Min Rp 50.000, Bank Transfer only)
   */
  async createFoodCourtWithdrawal(
    user: AuthUser,
    body: RequestFoodCourtWithdrawalDTOType,
    foodCourtId?: string,
  ) {
    const foodCourt = await this.resolveFoodCourt(user, foodCourtId);

    return await db.transaction(async (tx) => {
      // Lock food court row for atomic balance check and deduction
      const [freshFc] = await tx
        .select()
        .from(foodCourts)
        .where(eq(foodCourts.id, foodCourt.id))
        .for("update");

      if (!freshFc) {
        throw new NotFoundError("Food court tidak ditemukan");
      }

      const currentBalance = freshFc.balance || 0;
      if (body.amount > currentBalance) {
        throw new BadRequestError(
          `Saldo cabang food court tidak mencukupi untuk penarikan Rp ${body.amount.toLocaleString("id-ID")}. Saldo saat ini: Rp ${currentBalance.toLocaleString("id-ID")}`,
        );
      }

      const newBalance = currentBalance - body.amount;

      // Update food court balance & save default bank info
      await tx
        .update(foodCourts)
        .set({
          balance: newBalance,
          bankName: body.bankName,
          bankAccountNumber: body.bankAccountNumber,
          bankAccountHolder: body.bankAccountHolder,
          updatedAt: new Date(),
        })
        .where(eq(foodCourts.id, foodCourt.id));

      const withdrawalId = crypto.randomUUID();

      // Insert withdrawal request
      await tx.insert(foodCourtWithdrawals).values({
        id: withdrawalId,
        foodCourtId: foodCourt.id,
        amount: body.amount,
        paymentMethod: "TRANSFER",
        bankName: body.bankName,
        bankAccountNumber: body.bankAccountNumber,
        bankAccountHolder: body.bankAccountHolder,
        status: "PENDING",
        requestedBy: user.id,
        requestedAt: new Date(),
      });

      // Record hold log in balance ledger
      await tx.insert(foodCourtBalanceLogs).values({
        id: crypto.randomUUID(),
        foodCourtId: foodCourt.id,
        withdrawalId,
        type: "WITHDRAWAL_HOLD",
        netAmount: -body.amount,
        balanceAfter: newBalance,
        description: `Pengajuan penarikan dana ke rekening ${body.bankName} ${body.bankAccountNumber} a/n ${body.bankAccountHolder}`,
        createdAt: new Date(),
      });

      return tx.query.foodCourtWithdrawals.findFirst({
        where: eq(foodCourtWithdrawals.id, withdrawalId),
      });
    });
  }

  /**
   * List withdrawals for a specific food court
   */
  async listFoodCourtWithdrawals(
    user: AuthUser,
    foodCourtId?: string,
    statusFilter?: string,
  ) {
    const foodCourt = await this.resolveFoodCourt(user, foodCourtId);

    const conditions = [eq(foodCourtWithdrawals.foodCourtId, foodCourt.id)];
    if (statusFilter && statusFilter !== "ALL") {
      conditions.push(eq(foodCourtWithdrawals.status, statusFilter as any));
    }

    return db.query.foodCourtWithdrawals.findMany({
      where: and(...conditions),
      orderBy: [desc(foodCourtWithdrawals.requestedAt)],
      with: {
        requester: true,
        processor: true,
      },
    });
  }

  /**
   * Food court manager confirms receipt of disbursed funds
   */
  async confirmFoodCourtWithdrawal(user: AuthUser, withdrawalId: string) {
    const foodCourt = await this.resolveFoodCourt(user);

    return await db.transaction(async (tx) => {
      const [wr] = await tx
        .select()
        .from(foodCourtWithdrawals)
        .where(
          and(
            eq(foodCourtWithdrawals.id, withdrawalId),
            eq(foodCourtWithdrawals.foodCourtId, foodCourt.id),
          ),
        )
        .for("update");

      if (!wr) {
        throw new NotFoundError("Pengajuan penarikan dana tidak ditemukan");
      }

      if (wr.status !== "PROCESSED") {
        throw new BadRequestError(
          `Penarikan belum dapat dikonfirmasi karena status saat ini adalah ${wr.status}`,
        );
      }

      const [freshFc] = await tx
        .select()
        .from(foodCourts)
        .where(eq(foodCourts.id, foodCourt.id));

      await tx
        .update(foodCourtWithdrawals)
        .set({
          status: "COMPLETED",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(foodCourtWithdrawals.id, wr.id));

      // Record ledger entry
      await tx.insert(foodCourtBalanceLogs).values({
        id: crypto.randomUUID(),
        foodCourtId: foodCourt.id,
        withdrawalId: wr.id,
        type: "WITHDRAWAL_COMPLETED",
        netAmount: 0,
        balanceAfter: freshFc?.balance || 0,
        description: `Penerimaan pencairan dana transfer bank selesai dikonfirmasi oleh pengelola cabang`,
        createdAt: new Date(),
      });

      return tx.query.foodCourtWithdrawals.findFirst({
        where: eq(foodCourtWithdrawals.id, wr.id),
      });
    });
  }

  /**
   * Super Admin: List all withdrawal requests across all food courts
   */
  async listSuperAdminWithdrawals(
    user: AuthUser,
    query?: { status?: string; foodCourtId?: string },
  ) {
    if (user.role !== "admin") {
      throw new ForbiddenError("Hanya Super Admin yang dapat mengakses seluruh antrean pencairan cabang");
    }

    const conditions: any[] = [];
    if (query?.foodCourtId) {
      conditions.push(eq(foodCourtWithdrawals.foodCourtId, query.foodCourtId));
    }
    if (query?.status && query.status !== "ALL") {
      conditions.push(eq(foodCourtWithdrawals.status, query.status as any));
    }

    return db.query.foodCourtWithdrawals.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(foodCourtWithdrawals.requestedAt)],
      with: {
        foodCourt: true,
        requester: true,
        processor: true,
      },
    });
  }

  /**
   * Super Admin: Process Food Court withdrawal with proof of transfer
   */
  async processSuperAdminWithdrawal(
    user: AuthUser,
    withdrawalId: string,
    body: ProcessFoodCourtWithdrawalDTOType,
  ) {
    if (user.role !== "admin") {
      throw new ForbiddenError("Hanya Super Admin yang berwenang memproses pencairan dana cabang");
    }

    return await db.transaction(async (tx) => {
      const [wr] = await tx
        .select()
        .from(foodCourtWithdrawals)
        .where(eq(foodCourtWithdrawals.id, withdrawalId))
        .for("update");

      if (!wr) {
        throw new NotFoundError("Pengajuan penarikan dana cabang tidak ditemukan");
      }

      if (wr.status !== "PENDING") {
        throw new BadRequestError(
          `Pengajuan penarikan tidak dapat diproses karena status saat ini adalah ${wr.status}`,
        );
      }

      await tx
        .update(foodCourtWithdrawals)
        .set({
          status: "PROCESSED",
          proofReceiptUrl: body.proofReceiptUrl,
          transferReference: body.transferReference?.trim() || null,
          adminNotes: body.adminNotes?.trim() || null,
          processedBy: user.id,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(foodCourtWithdrawals.id, wr.id));

      return tx.query.foodCourtWithdrawals.findFirst({
        where: eq(foodCourtWithdrawals.id, wr.id),
        with: { foodCourt: true, processor: true },
      });
    });
  }

  /**
   * Super Admin: Reject withdrawal and automatically refund held balance
   */
  async rejectSuperAdminWithdrawal(
    user: AuthUser,
    withdrawalId: string,
    reason: string,
  ) {
    if (user.role !== "admin") {
      throw new ForbiddenError("Hanya Super Admin yang berwenang menolak penarikan dana cabang");
    }

    return await db.transaction(async (tx) => {
      const [wr] = await tx
        .select()
        .from(foodCourtWithdrawals)
        .where(eq(foodCourtWithdrawals.id, withdrawalId))
        .for("update");

      if (!wr) {
        throw new NotFoundError("Pengajuan penarikan dana cabang tidak ditemukan");
      }

      if (wr.status !== "PENDING" && wr.status !== "PROCESSED") {
        throw new BadRequestError(
          `Penarikan dengan status ${wr.status} tidak dapat ditolak`,
        );
      }

      // Lock food court row to read fresh live balance (prevent stale overwrite bug)
      const [fc] = await tx
        .select()
        .from(foodCourts)
        .where(eq(foodCourts.id, wr.foodCourtId))
        .for("update");

      if (!fc) {
        throw new NotFoundError("Food court tidak ditemukan");
      }

      const currentFcBalance = fc.balance || 0;
      const refundedBalance = currentFcBalance + wr.amount;

      await tx
        .update(foodCourts)
        .set({
          balance: refundedBalance,
          updatedAt: new Date(),
        })
        .where(eq(foodCourts.id, fc.id));

      // Update withdrawal record
      await tx
        .update(foodCourtWithdrawals)
        .set({
          status: "REJECTED",
          adminNotes: reason,
          processedBy: user.id,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(foodCourtWithdrawals.id, wr.id));

      // Log refund to food court balance ledger
      await tx.insert(foodCourtBalanceLogs).values({
        id: crypto.randomUUID(),
        foodCourtId: fc.id,
        withdrawalId: wr.id,
        type: "WITHDRAWAL_REFUND",
        netAmount: wr.amount,
        balanceAfter: refundedBalance,
        description: `Pengembalian dana penarikan ditolak Super Admin: ${reason}`,
        createdAt: new Date(),
      });

      return tx.query.foodCourtWithdrawals.findFirst({
        where: eq(foodCourtWithdrawals.id, wr.id),
        with: { foodCourt: true, processor: true },
      });
    });
  }

  /**
   * Super Admin: Direct complete withdrawal
   */
  async completeSuperAdminWithdrawal(user: AuthUser, withdrawalId: string) {
    if (user.role !== "admin") {
      throw new ForbiddenError("Hanya Super Admin yang berwenang menyelesaikan penarikan dana cabang");
    }

    return await db.transaction(async (tx) => {
      const [wr] = await tx
        .select()
        .from(foodCourtWithdrawals)
        .where(eq(foodCourtWithdrawals.id, withdrawalId))
        .for("update");

      if (!wr) {
        throw new NotFoundError("Pengajuan penarikan dana cabang tidak ditemukan");
      }

      if (wr.status === "COMPLETED") {
        throw new BadRequestError("Penarikan sudah diselesaikan");
      }

      if (wr.status === "REJECTED") {
        throw new BadRequestError("Penarikan yang sudah ditolak tidak dapat diselesaikan");
      }

      const [freshFc] = await tx
        .select()
        .from(foodCourts)
        .where(eq(foodCourts.id, wr.foodCourtId));

      await tx
        .update(foodCourtWithdrawals)
        .set({
          status: "COMPLETED",
          completedAt: new Date(),
          processedBy: user.id,
          processedAt: wr.processedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(foodCourtWithdrawals.id, wr.id));

      // Record ledger entry
      await tx.insert(foodCourtBalanceLogs).values({
        id: crypto.randomUUID(),
        foodCourtId: wr.foodCourtId,
        withdrawalId: wr.id,
        type: "WITHDRAWAL_COMPLETED",
        netAmount: 0,
        balanceAfter: freshFc?.balance || 0,
        description: `Pencairan dana transfer bank diselesaikan langsung oleh Super Admin`,
        createdAt: new Date(),
      });

      return tx.query.foodCourtWithdrawals.findFirst({
        where: eq(foodCourtWithdrawals.id, wr.id),
        with: { foodCourt: true },
      });
    });
  }

  /**
   * Super Admin: Get aggregated 1% platform revenue metrics and branch breakdowns
   */
  async getPlatformRevenue(user: AuthUser) {
    if (user.role !== "admin") {
      throw new ForbiddenError("Hanya Super Admin yang dapat mengakses laporan pendapatan fee platform");
    }

    // Query all settlement and adjustment logs that generated platform fees
    const settlementLogs = await db.query.foodCourtBalanceLogs.findMany({
      where: sql`${foodCourtBalanceLogs.platformFee} > 0`,
      with: {
        foodCourt: true,
      },
      orderBy: [desc(foodCourtBalanceLogs.createdAt)],
    });

    const totalEarnedPlatformFee = settlementLogs.reduce(
      (acc, curr) => acc + (curr.platformFee || 0),
      0,
    );
    const totalSubtotalVolume = settlementLogs.reduce(
      (acc, curr) => acc + (curr.subtotalAmount || 0),
      0,
    );
    const totalOrdersCount = settlementLogs.length;

    // Per food court breakdown
    const allCourts = await db.query.foodCourts.findMany();
    const branchMap: Record<
      string,
      {
        foodCourtId: string;
        name: string;
        slug: string;
        balance: number;
        totalOrders: number;
        totalSubtotal: number;
        platformFeeContributed: number;
      }
    > = {};

    for (const fc of allCourts) {
      branchMap[fc.id] = {
        foodCourtId: fc.id,
        name: fc.name,
        slug: fc.slug,
        balance: fc.balance || 0,
        totalOrders: 0,
        totalSubtotal: 0,
        platformFeeContributed: 0,
      };
    }

    // Monthly trend aggregation
    const monthlyMap: Record<
      string,
      { month: string; platformFee: number; subtotal: number; orderCount: number }
    > = {};

    for (const log of settlementLogs) {
      if (log.foodCourtId && branchMap[log.foodCourtId]) {
        branchMap[log.foodCourtId].totalOrders += 1;
        branchMap[log.foodCourtId].totalSubtotal += log.subtotalAmount || 0;
        branchMap[log.foodCourtId].platformFeeContributed += log.platformFee || 0;
      }

      const date = new Date(log.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          platformFee: 0,
          subtotal: 0,
          orderCount: 0,
        };
      }
      monthlyMap[monthKey].platformFee += log.platformFee || 0;
      monthlyMap[monthKey].subtotal += log.subtotalAmount || 0;
      monthlyMap[monthKey].orderCount += 1;
    }

    const branchBreakdown = Object.values(branchMap);
    const monthlyTrends = Object.values(monthlyMap).sort((a, b) =>
      a.month.localeCompare(b.month),
    );

    return {
      totalEarnedPlatformFee,
      totalSubtotalVolume,
      totalOrdersCount,
      branchBreakdown,
      monthlyTrends,
      recentLogs: settlementLogs.slice(0, 30),
    };
  }

  /**
   * Super Admin: Historical data adjustment to reimburse 1% platform fee to tenants
   * and allocate absorbed platform fee to food courts per spec Section 4.3.
   */
  async reconcileTenantFees(user: AuthUser) {
    if (user.role !== "admin") {
      throw new ForbiddenError("Hanya Super Admin yang berwenang merekonsiliasi data keuangan historis");
    }

    return await db.transaction(async (tx) => {
      // Find all tenant balance logs where platformFee > 0
      const historicalLogs = await tx.query.tenantBalanceLogs.findMany({
        where: and(
          eq(tenantBalanceLogs.type, "ORDER_REVENUE"),
          sql`${tenantBalanceLogs.platformFee} > 0`,
        ),
      });

      let reconciledCount = 0;
      let totalReimbursedAmount = 0;

      for (const oldLog of historicalLogs) {
        const feeToReimburse = oldLog.platformFee;
        if (feeToReimburse <= 0) continue;

        // Lock tenant row for atomic balance update
        const [tenant] = await tx
          .select()
          .from(tenants)
          .where(eq(tenants.id, oldLog.tenantId))
          .for("update");

        if (!tenant) continue;

        const newBalance = (tenant.balance || 0) + feeToReimburse;

        // 1. Update tenant balance
        await tx
          .update(tenants)
          .set({
            balance: newBalance,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenant.id));

        // 2. Record adjustment ledger entry in tenant ledger (FEE_REIMBURSEMENT)
        await tx.insert(tenantBalanceLogs).values({
          id: crypto.randomUUID(),
          tenantId: tenant.id,
          tenantOrderId: oldLog.tenantOrderId,
          type: "ADJUSTMENT",
          grossAmount: 0,
          platformFee: 0,
          netAmount: feeToReimburse,
          balanceAfter: newBalance,
          description: `Koreksi pengembalian potongan fee platform 1% (FEE_REIMBURSEMENT: Rp ${feeToReimburse.toLocaleString("id-ID")})`,
          createdAt: new Date(),
        });

        // 3. Update original log so platformFee is 0
        await tx
          .update(tenantBalanceLogs)
          .set({
            platformFee: 0,
            netAmount: oldLog.grossAmount,
          })
          .where(eq(tenantBalanceLogs.id, oldLog.id));

        // 4. Update Food Court ledger with corresponding platform fee allocation per spec Section 4.3
        if (tenant.foodCourtId) {
          const [fc] = await tx
            .select()
            .from(foodCourts)
            .where(eq(foodCourts.id, tenant.foodCourtId))
            .for("update");

          if (fc) {
            const fcBalanceAfter = (fc.balance || 0) - feeToReimburse;

            await tx
              .update(foodCourts)
              .set({
                balance: fcBalanceAfter,
                updatedAt: new Date(),
              })
              .where(eq(foodCourts.id, fc.id));

            // Find orderId if tenantOrderId is known
            let resolvedOrderId: string | null = null;
            if (oldLog.tenantOrderId) {
              const tOrder = await tx.query.tenantOrders.findFirst({
                where: eq(tenantOrders.id, oldLog.tenantOrderId),
              });
              resolvedOrderId = tOrder?.orderId || null;
            }

            await tx.insert(foodCourtBalanceLogs).values({
              id: crypto.randomUUID(),
              foodCourtId: fc.id,
              orderId: resolvedOrderId,
              type: "ADJUSTMENT",
              subtotalAmount: oldLog.grossAmount,
              serviceFee: 0,
              taxAmount: 0,
              platformFee: feeToReimburse,
              netAmount: -feeToReimburse,
              balanceAfter: fcBalanceAfter,
              description: `Penyesuaian serapan fee platform 1% historis pesanan tenant ${tenant.name} (Stan ${tenant.stallNumber})`,
              createdAt: new Date(),
            });
          }
        }

        reconciledCount++;
        totalReimbursedAmount += feeToReimburse;
      }

      return {
        message: `Rekonsiliasi berhasil. ${reconciledCount} catatan historis disesuaikan dengan total pengembalian Rp ${totalReimbursedAmount.toLocaleString("id-ID")}`,
        reconciledCount,
        totalReimbursedAmount,
      };
    });
  }
}

export const foodCourtWalletService = new FoodCourtWalletService();
