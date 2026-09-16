import { desc, eq } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "../../common/errors";
import { db } from "../../db";
import {
  orders,
  orderStatusLogs,
  paymentGroups,
  payments,
  tenantOrders,
} from "../../db/schema";
import type { ProcessPaymentDTOType } from "./model";

export class PaymentService {
  async processPayment(data: ProcessPaymentDTOType) {
    let pGroup = null;

    if (data.paymentGroupId) {
      pGroup = await db.query.paymentGroups.findFirst({
        where: eq(paymentGroups.id, data.paymentGroupId),
        with: {
          order: true,
          payments: true,
        },
      });
      if (!pGroup) {
        throw new NotFoundError(
          `Payment group '${data.paymentGroupId}' not found`,
        );
      }
    } else if (data.orderId) {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, data.orderId),
        with: {
          paymentGroups: {
            with: { payments: true },
          },
        },
      });

      if (!order) {
        throw new NotFoundError(`Order '${data.orderId}' not found`);
      }

      // Find first pending payment group or first group
      pGroup =
        order.paymentGroups.find((pg) => pg.status === "PENDING") ??
        order.paymentGroups[0];

      if (!pGroup) {
        throw new NotFoundError(
          `No payment group found for order '${data.orderId}'`,
        );
      }
    } else {
      throw new BadRequestError("Provide either orderId or paymentGroupId");
    }

    if (pGroup.status === "PAID") {
      throw new BadRequestError("This bill has already been paid");
    }

    const orderId = pGroup.orderId;
    const requiredAmount = pGroup.amountDue;
    const paymentAmount = data.amount ?? requiredAmount;

    if (paymentAmount < requiredAmount) {
      throw new BadRequestError(
        `Insufficient payment amount. Required: ${requiredAmount}, Provided: ${paymentAmount}`,
      );
    }

    // Normalize payment method
    const methodUpper = data.paymentMethod.toUpperCase();
    let methodEnum: "QRIS" | "CASH" | "CARD" | "E_WALLET" | "BANK_TRANSFER" =
      "QRIS";

    if (methodUpper === "CASH") methodEnum = "CASH";
    else if (methodUpper === "TRANSFER" || methodUpper === "BANK_TRANSFER")
      methodEnum = "BANK_TRANSFER";
    else if (methodUpper === "CARD") methodEnum = "CARD";
    else if (methodUpper === "E_WALLET") methodEnum = "E_WALLET";

    const paymentId = crypto.randomUUID();
    const paymentReference = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const newPayment = {
      id: paymentId,
      paymentGroupId: pGroup.id,
      paymentReference,
      paymentMethod: methodEnum,
      provider: data.provider ?? (methodEnum === "CASH" ? "Manual" : "Gateway"),
      amount: paymentAmount,
      status: "SUCCESS" as const,
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(payments).values(newPayment);

    // Update payment group status to PAID
    await db
      .update(paymentGroups)
      .set({
        status: "PAID",
        amountPaid: paymentAmount,
        updatedAt: new Date(),
      })
      .where(eq(paymentGroups.id, pGroup.id));

    // Check if all groups for this order are now paid
    const allGroups = await db.query.paymentGroups.findMany({
      where: eq(paymentGroups.orderId, orderId),
    });
    const allPaid = allGroups.every((g) =>
      g.id === pGroup.id ? true : g.status === "PAID",
    );

    if (allPaid) {
      // Update order status to CONFIRMED and payment to PAID
      await db
        .update(orders)
        .set({
          paymentStatus: "PAID",
          orderStatus: "CONFIRMED",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Push all tenant orders to QUEUED
      await db
        .update(tenantOrders)
        .set({
          status: "QUEUED",
          updatedAt: new Date(),
        })
        .where(eq(tenantOrders.orderId, orderId));

      // Log payment confirmation
      await db.insert(orderStatusLogs).values({
        id: crypto.randomUUID(),
        orderId,
        status: "CONFIRMED",
        description: `Payment completed via ${methodEnum}. Order forwarded to kitchen.`,
        createdAt: new Date(),
      });
    }

    return {
      id: paymentId,
      orderId,
      paymentGroupId: pGroup.id,
      paymentReference,
      paymentMethod: methodEnum.toLowerCase(),
      paymentStatus: "paid",
      amount: paymentAmount,
      status: "SUCCESS",
      paidAt: newPayment.paidAt,
    };
  }

  async getByOrderId(orderId: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        paymentGroups: {
          with: { payments: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found`);
    }

    const allPayments = order.paymentGroups.flatMap((pg) => pg.payments);
    const latestPayment = allPayments[0];

    if (!latestPayment) {
      throw new NotFoundError(`Payment for order '${orderId}' not found`);
    }

    return {
      ...latestPayment,
      orderId,
      paymentMethod: latestPayment.paymentMethod.toLowerCase(),
      paymentStatus: latestPayment.status === "SUCCESS" ? "paid" : "pending",
    };
  }
}

export const paymentService = new PaymentService();
