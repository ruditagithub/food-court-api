import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { orders, tenantBalanceLogs, tenantOrders, tenants } from "../../db/schema";

export function calculateSettlement(grossAmount: number): {
  platformFee: number;
  netAmount: number;
} {
  const platformFee = Math.round(grossAmount * 0.01);
  const netAmount = grossAmount - platformFee;
  return { platformFee, netAmount };
}

export async function settleOrderTenantRevenues(orderId: string): Promise<void> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      tenantOrders: true,
    },
  });

  if (!order || !order.tenantOrders || order.tenantOrders.length === 0) {
    return;
  }

  for (const tOrder of order.tenantOrders) {
    // Idempotency check: don't settle the same tenant order twice
    const existingLog = await db.query.tenantBalanceLogs.findFirst({
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

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tOrder.tenantId),
    });

    if (!tenant) {
      continue;
    }

    const currentBalance = tenant.balance || 0;
    const balanceAfter = currentBalance + netAmount;

    // Update tenant balance
    await db
      .update(tenants)
      .set({
        balance: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenant.id));

    // Record ledger log
    await db.insert(tenantBalanceLogs).values({
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      tenantOrderId: tOrder.id,
      type: "ORDER_REVENUE",
      grossAmount,
      platformFee,
      netAmount,
      balanceAfter,
      description: `Pendapatan pesanan #${order.orderNumber} (Gross: Rp ${grossAmount.toLocaleString("id-ID")} - Biaya Aplikasi 1%: Rp ${platformFee.toLocaleString("id-ID")})`,
      createdAt: new Date(),
    });
  }
}
