import { eq } from "drizzle-orm";
import { BadRequestError, NotFoundError } from "../../common/errors";
import { db } from "../../db";
import { orders, payments } from "../../db/schema";
import type { ProcessPaymentDTOType } from "./model";

export class PaymentService {
  async processPayment(data: ProcessPaymentDTOType) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, data.orderId),
      with: {
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${data.orderId}' not found`);
    }

    if (order.payment && order.payment.paymentStatus === "paid") {
      throw new BadRequestError("This order has already been paid");
    }

    const paymentAmount = data.amount ?? order.totalPrice;
    if (paymentAmount < order.totalPrice) {
      throw new BadRequestError(
        `Insufficient payment amount. Required: ${order.totalPrice}, Provided: ${paymentAmount}`,
      );
    }

    const paymentId = crypto.randomUUID();
    const newPayment = {
      id: paymentId,
      orderId: data.orderId,
      amount: paymentAmount,
      paymentMethod: data.paymentMethod,
      paymentStatus: "paid" as const,
      paidAt: new Date(),
      createdAt: new Date(),
    };

    if (order.payment) {
      await db
        .update(payments)
        .set({
          amount: paymentAmount,
          paymentMethod: data.paymentMethod,
          paymentStatus: "paid",
          paidAt: new Date(),
        })
        .where(eq(payments.id, order.payment.id));
    } else {
      await db.insert(payments).values(newPayment);
    }

    // Update order status to 'confirmed' if it was 'pending'
    if (order.status === "pending") {
      await db
        .update(orders)
        .set({ status: "confirmed", updatedAt: new Date() })
        .where(eq(orders.id, data.orderId));
    }

    return db.query.payments.findFirst({
      where: eq(payments.orderId, data.orderId),
      with: {
        order: true,
      },
    });
  }

  async getByOrderId(orderId: string) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.orderId, orderId),
      with: {
        order: true,
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment for order '${orderId}' not found`);
    }

    return payment;
  }
}

export const paymentService = new PaymentService();
