import { desc, eq } from "drizzle-orm";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../common/errors";
import { db } from "../../db";
import {
  orders,
  orderStatusLogs,
  paymentGroups,
  payments,
  tenantOrders,
} from "../../db/schema";
import { env } from "../../config/env";
import {
  assertMidtransConfigured,
  isValidSignature,
  mapPaymentType,
  mapTransactionStatus,
  snap,
  type MidtransTransactionStatus,
  type PaymentMethodEnum,
} from "../../libs/midtrans";
import type { CreateSnapPaymentDTOType, ProcessPaymentDTOType } from "./model";
import { orderService } from "../orders/service";

const SNAP_EXPIRY_MINUTES = 30;

type PaymentGroup = typeof paymentGroups.$inferSelect;

const generateReference = () =>
  `PAY-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

export class PaymentService {
  /** Finds the bill to pay: explicit paymentGroupId, or the order's first pending group. */
  private async resolvePaymentGroup(data: {
    orderId?: string;
    paymentGroupId?: string;
  }): Promise<PaymentGroup> {
    if (data.paymentGroupId) {
      const group = await db.query.paymentGroups.findFirst({
        where: eq(paymentGroups.id, data.paymentGroupId),
      });
      if (!group) {
        throw new NotFoundError(
          `Payment group '${data.paymentGroupId}' not found`,
        );
      }
      return group;
    }

    if (!data.orderId) {
      throw new BadRequestError("Provide either orderId or paymentGroupId");
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, data.orderId),
      with: { paymentGroups: true },
    });
    if (!order) {
      throw new NotFoundError(`Order '${data.orderId}' not found`);
    }

    const group =
      order.paymentGroups.find((pg) => pg.status === "PENDING") ??
      order.paymentGroups[0];
    if (!group) {
      throw new NotFoundError(
        `No payment group found for order '${data.orderId}'`,
      );
    }
    return group;
  }

  /** Marks a bill as paid; when every bill of the order is paid, sends the order to the kitchen. */
  private async settlePaymentGroup(
    group: PaymentGroup,
    amountPaid: number,
    method: PaymentMethodEnum,
  ) {
    await db
      .update(paymentGroups)
      .set({ status: "PAID", amountPaid, updatedAt: new Date() })
      .where(eq(paymentGroups.id, group.id));

    const allGroups = await db.query.paymentGroups.findMany({
      where: eq(paymentGroups.orderId, group.orderId),
    });
    const allPaid = allGroups.every(
      (g) => g.id === group.id || g.status === "PAID",
    );
    if (!allPaid) return;

    await db
      .update(orders)
      .set({
        paymentStatus: "PAID",
        orderStatus: "CONFIRMED",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, group.orderId));

    await db
      .update(tenantOrders)
      .set({ status: "QUEUED", updatedAt: new Date() })
      .where(eq(tenantOrders.orderId, group.orderId));

    await db.insert(orderStatusLogs).values({
      id: crypto.randomUUID(),
      orderId: group.orderId,
      status: "CONFIRMED",
      description: `Payment completed via ${method}. Order forwarded to kitchen.`,
      createdAt: new Date(),
    });

    await orderService.completePayment(group.orderId);
  }

  /** Manual / cashier payment (marked SUCCESS immediately). */
  async processPayment(data: ProcessPaymentDTOType) {
    const pGroup = await this.resolvePaymentGroup(data);

    if (pGroup.status === "PAID") {
      throw new BadRequestError("This bill has already been paid");
    }

    const requiredAmount = pGroup.amountDue;
    const paymentAmount = data.amount ?? requiredAmount;

    if (paymentAmount < requiredAmount) {
      throw new BadRequestError(
        `Insufficient payment amount. Required: ${requiredAmount}, Provided: ${paymentAmount}`,
      );
    }

    // Normalize payment method
    const methodUpper = data.paymentMethod.toUpperCase();
    let methodEnum: PaymentMethodEnum = "QRIS";

    if (methodUpper === "CASH") methodEnum = "CASH";
    else if (methodUpper === "TRANSFER" || methodUpper === "BANK_TRANSFER")
      methodEnum = "BANK_TRANSFER";
    else if (methodUpper === "CARD") methodEnum = "CARD";
    else if (methodUpper === "E_WALLET") methodEnum = "E_WALLET";

    const newPayment = {
      id: crypto.randomUUID(),
      paymentGroupId: pGroup.id,
      paymentReference: generateReference(),
      paymentMethod: methodEnum,
      provider: data.provider ?? (methodEnum === "CASH" ? "Manual" : "Gateway"),
      amount: paymentAmount,
      status: "SUCCESS" as const,
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(payments).values(newPayment);
    await this.settlePaymentGroup(pGroup, paymentAmount, methodEnum);

    return {
      id: newPayment.id,
      orderId: pGroup.orderId,
      paymentGroupId: pGroup.id,
      paymentReference: newPayment.paymentReference,
      paymentMethod: methodEnum.toLowerCase(),
      paymentStatus: "paid",
      amount: paymentAmount,
      status: "SUCCESS",
      paidAt: newPayment.paidAt,
    };
  }

  /** Creates a Midtrans Snap transaction and a PENDING payment row. */
  async createSnapPayment(data: CreateSnapPaymentDTOType) {
    assertMidtransConfigured();

    const pGroup = await this.resolvePaymentGroup(data);
    if (pGroup.status === "PAID") {
      throw new BadRequestError("This bill has already been paid");
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, pGroup.orderId),
      with: { session: { with: { participants: true } } },
    });
    const participant = order?.session.participants.find(
      (p) => p.id === pGroup.participantId,
    );

    // Midtrans order_id must be unique per attempt; we use paymentReference.
    const paymentReference = `${order?.orderNumber ?? "ORD"}-${Date.now()}`;

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: paymentReference,
        gross_amount: pGroup.amountDue,
      },
      customer_details: participant ? { first_name: participant.name } : undefined,
      expiry: { unit: "minutes", duration: SNAP_EXPIRY_MINUTES },
    });

    const paymentId = crypto.randomUUID();
    const expiredAt = new Date(Date.now() + SNAP_EXPIRY_MINUTES * 60_000);

    await db.insert(payments).values({
      id: paymentId,
      paymentGroupId: pGroup.id,
      paymentReference,
      provider: "midtrans",
      amount: pGroup.amountDue,
      status: "PENDING",
      expiredAt,
    });

    return {
      id: paymentId,
      orderId: pGroup.orderId,
      paymentGroupId: pGroup.id,
      paymentReference,
      amount: pGroup.amountDue,
      status: "PENDING",
      expiredAt,
      snapToken: transaction.token,
      redirectUrl: transaction.redirect_url,
      clientKey: env.MIDTRANS_CLIENT_KEY,
      isProduction: env.MIDTRANS_IS_PRODUCTION,
    };
  }

  /** Midtrans HTTP notification (webhook). */
  async handleMidtransNotification(notification: MidtransTransactionStatus) {
    if (!isValidSignature(notification)) {
      throw new UnauthorizedError("Invalid Midtrans signature");
    }
    // Re-fetch from Midtrans so we never trust the webhook body alone.
    return this.syncMidtransStatus(notification.order_id);
  }

  /** Pulls latest status from Midtrans and applies it (idempotent). */
  async syncMidtransStatus(paymentReference: string) {
    assertMidtransConfigured();

    const payment = await db.query.payments.findFirst({
      where: eq(payments.paymentReference, paymentReference),
      with: { paymentGroup: true },
    });
    if (!payment) {
      throw new NotFoundError(`Payment '${paymentReference}' not found`);
    }

    const remote = await snap.transaction.status(paymentReference);
    const status = mapTransactionStatus(remote);
    const method = mapPaymentType(remote.payment_type);

    if (status === "SUCCESS" && Number(remote.gross_amount) !== payment.amount) {
      throw new BadRequestError(
        `Amount mismatch for '${paymentReference}': expected ${payment.amount}, got ${remote.gross_amount}`,
      );
    }

    const alreadySucceeded = payment.status === "SUCCESS";

    await db
      .update(payments)
      .set({
        status,
        paymentMethod: method,
        paidAt: status === "SUCCESS" ? (payment.paidAt ?? new Date()) : payment.paidAt,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    if (
      status === "SUCCESS" &&
      !alreadySucceeded &&
      payment.paymentGroup.status !== "PAID"
    ) {
      await this.settlePaymentGroup(payment.paymentGroup, payment.amount, method);
    }

    return {
      id: payment.id,
      orderId: payment.paymentGroup.orderId,
      paymentReference,
      paymentMethod: method.toLowerCase(),
      transactionStatus: remote.transaction_status,
      status,
    };
  }

  async getByOrderId(orderId: string) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        paymentGroups: {
          with: { payments: { orderBy: desc(payments.createdAt) } },
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
