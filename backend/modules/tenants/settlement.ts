import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  foodCourtBalanceLogs,
  foodCourts,
  orders,
  tenantBalanceLogs,
  tenantOrders,
  tenants,
} from "../../db/schema";

/**
 * Per 2026-10-27 specification:
 * Tenant receives 100% of their gross item sales (zero deduction).
 * The 1% platform fee is absorbed exclusively by the Food Court.
 */
export function calculateSettlement(grossAmount: number): {
  platformFee: number;
  netAmount: number;
} {
  return { platformFee: 0, netAmount: grossAmount };
}

export function calculatePlatformFee(subtotal: number): number {
  return Math.round(subtotal * 0.01);
}

export function calculateFoodCourtSettlement(
  subtotal: number,
  serviceFee: number,
  taxAmount: number,
): {
  platformFee: number;
  netAmount: number;
} {
  const platformFee = calculatePlatformFee(subtotal);
  const netAmount = serviceFee + taxAmount - platformFee;
  return { platformFee, netAmount };
}

export async function settleOrderTenantRevenues(orderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        tenantOrders: true,
        session: true,
      },
    });

    if (!order || !order.tenantOrders || order.tenantOrders.length === 0) {
      return;
    }

    // 1. Settle 100% gross revenue to each tenant (0% platform fee deduction)
    for (const tOrder of order.tenantOrders) {
      // Idempotency check: don't settle the same tenant order twice
      const existingLog = await tx.query.tenantBalanceLogs.findFirst({
        where: and(
          eq(tenantBalanceLogs.tenantOrderId, tOrder.id),
          eq(tenantBalanceLogs.type, "ORDER_REVENUE"),
        ),
      });

      if (existingLog) {
        continue;
      }

      const grossAmount = tOrder.subtotal || 0;
      if (grossAmount <= 0) {
        continue;
      }

      const { platformFee, netAmount } = calculateSettlement(grossAmount);

      // Lock tenant row for atomic balance update
      const [tenant] = await tx
        .select()
        .from(tenants)
        .where(eq(tenants.id, tOrder.tenantId))
        .for("update");

      if (!tenant) {
        continue;
      }

      const currentBalance = tenant.balance || 0;
      const balanceAfter = currentBalance + netAmount;

      // Update tenant balance
      await tx
        .update(tenants)
        .set({
          balance: balanceAfter,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenant.id));

      // Record tenant ledger log
      await tx.insert(tenantBalanceLogs).values({
        id: crypto.randomUUID(),
        tenantId: tenant.id,
        tenantOrderId: tOrder.id,
        type: "ORDER_REVENUE",
        grossAmount,
        platformFee,
        netAmount,
        balanceAfter,
        description: `Pendapatan pesanan #${order.orderNumber} (Gross: Rp ${grossAmount.toLocaleString("id-ID")})`,
        createdAt: new Date(),
      });
    }

    // 2. Settle Food Court net revenue (serviceFee + taxAmount - 1% platform fee)
    let foodCourtId = order.session?.foodCourtId;
    if (!foodCourtId && order.tenantOrders.length > 0) {
      const firstTenant = await tx.query.tenants.findFirst({
        where: eq(tenants.id, order.tenantOrders[0].tenantId),
      });
      foodCourtId = firstTenant?.foodCourtId;
    }

    if (foodCourtId) {
      const existingFcLog = await tx.query.foodCourtBalanceLogs.findFirst({
        where: and(
          eq(foodCourtBalanceLogs.orderId, order.id),
          eq(foodCourtBalanceLogs.type, "ORDER_SETTLEMENT"),
        ),
      });

      if (!existingFcLog) {
        const subtotal = order.subtotal || 0;
        const serviceFee = order.serviceFee || 0;
        const taxAmount = order.taxAmount || 0;
        const { platformFee, netAmount: fcNetAmount } = calculateFoodCourtSettlement(
          subtotal,
          serviceFee,
          taxAmount,
        );

        // Lock food court row for atomic balance update
        const [foodCourt] = await tx
          .select()
          .from(foodCourts)
          .where(eq(foodCourts.id, foodCourtId))
          .for("update");

        if (foodCourt) {
          const fcCurrentBalance = foodCourt.balance || 0;
          const fcBalanceAfter = fcCurrentBalance + fcNetAmount;

          await tx
            .update(foodCourts)
            .set({
              balance: fcBalanceAfter,
              updatedAt: new Date(),
            })
            .where(eq(foodCourts.id, foodCourt.id));

          await tx.insert(foodCourtBalanceLogs).values({
            id: crypto.randomUUID(),
            foodCourtId: foodCourt.id,
            orderId: order.id,
            type: "ORDER_SETTLEMENT",
            subtotalAmount: subtotal,
            serviceFee,
            taxAmount,
            platformFee,
            netAmount: fcNetAmount,
            balanceAfter: fcBalanceAfter,
            description: `Settlement pesanan #${order.orderNumber} (Service: Rp ${serviceFee.toLocaleString("id-ID")}, PB1: Rp ${taxAmount.toLocaleString("id-ID")}, Fee Aplikasi 1%: -Rp ${platformFee.toLocaleString("id-ID")})`,
            createdAt: new Date(),
          });
        }
      }
    }
  });
}
