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
  paymentGroupItems,
  paymentGroups,
  sessionParticipants,
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
      with: { participant: true },
    });
    const currentGroupWithParticipant = allGroups.find((g) => g.id === group.id);
    const payerName = currentGroupWithParticipant?.participant?.name ?? "Customer";

    const allPaid = allGroups.every(
      (g) => g.id === group.id || g.status === "PAID",
    );

    if (!allPaid) {
      await db
        .update(orders)
        .set({
          paymentStatus: "PARTIALLY_PAID",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, group.orderId));

      await db.insert(orderStatusLogs).values({
        id: crypto.randomUUID(),
        orderId: group.orderId,
        status: "PARTIALLY_PAID",
        description: `Split bill payment completed by ${payerName} (${amountPaid}) via ${method}. Waiting for remaining participants.`,
        createdAt: new Date(),
      });
      return;
    }

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
      description: `All bills paid (final payment by ${payerName} via ${method}). Order forwarded to kitchen.`,
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

    const groupItems = await db.query.paymentGroupItems.findMany({
      where: eq(paymentGroupItems.paymentGroupId, pGroup.id),
      with: { orderItem: true },
    });

    const itemDetails =
      groupItems.length > 0
        ? groupItems.map((gi) => {
            const oi = gi.orderItem;
            const unitPrice =
              oi && oi.quantity > 0
                ? Math.round(oi.subtotal / oi.quantity)
                : gi.allocatedAmount;
            const qty =
              unitPrice > 0 ? Math.max(1, Math.round(gi.allocatedAmount / unitPrice)) : 1;
            return {
              id: gi.orderItemId.slice(0, 45),
              price: unitPrice,
              quantity: qty,
              name: (oi?.menuNameSnapshot ?? "Menu Item").slice(0, 50),
            };
          })
        : undefined;

    const itemsSum = itemDetails?.reduce((s, it) => s + it.price * it.quantity, 0) ?? 0;

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: paymentReference,
        gross_amount: pGroup.amountDue,
      },
      item_details: itemsSum === pGroup.amountDue ? itemDetails : undefined,
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

    let remote: any;
    try {
      remote = await snap.transaction.status(paymentReference);
    } catch (err: any) {
      const httpStatus = err?.httpStatusCode || err?.ApiResponse?.status_code;
      if (Number(httpStatus) === 404 || String(err?.message || "").includes("404")) {
        return {
          id: payment.id,
          orderId: payment.paymentGroup.orderId,
          paymentGroupId: payment.paymentGroupId,
          paymentReference,
          paymentMethod: payment.paymentMethod.toLowerCase(),
          paymentType: undefined,
          transactionStatus: "waiting_selection",
          status: payment.status,
          vaNumbers: [],
          permataVaNumber: null,
          billKey: null,
          billerCode: null,
          paymentCode: null,
          actions: [],
        };
      }
      throw err;
    }

    if (String(remote?.status_code) === "404") {
      return {
        id: payment.id,
        orderId: payment.paymentGroup.orderId,
        paymentGroupId: payment.paymentGroupId,
        paymentReference,
        paymentMethod: payment.paymentMethod.toLowerCase(),
        paymentType: undefined,
        transactionStatus: "waiting_selection",
        status: payment.status,
        vaNumbers: [],
        permataVaNumber: null,
        billKey: null,
        billerCode: null,
        paymentCode: null,
        actions: [],
      };
    }

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
      paymentGroupId: payment.paymentGroupId,
      paymentReference,
      paymentMethod: method.toLowerCase(),
      paymentType: remote.payment_type,
      transactionStatus: remote.transaction_status,
      status,
      vaNumbers: remote.va_numbers ?? [],
      permataVaNumber: remote.permata_va_number ?? null,
      billKey: remote.bill_key ?? null,
      billerCode: remote.biller_code ?? null,
      paymentCode: remote.payment_code ?? null,
      actions: remote.actions ?? [],
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
  /** Cashier: List all unpaid bills pending cash payment */
  async getPendingCashBills(query?: string) {
    const activeOrders = await db.query.orders.findMany({
      where: (ord, { inArray }) => inArray(ord.paymentStatus, ["PENDING", "PARTIALLY_PAID"]),
      orderBy: [desc(orders.createdAt)],
      with: {
        session: {
          with: { table: true, participants: true },
        },
        paymentGroups: {
          with: {
            participant: true,
            items: { with: { orderItem: true } },
          },
        },
      },
    });

    const pendingBills: any[] = [];

    for (const ord of activeOrders) {
      for (const pg of ord.paymentGroups) {
        if (pg.status === "PAID") continue;

        const itemsList = (pg.items ?? []).map((pgi: any) => ({
          orderItemId: pgi.orderItemId,
          menuName: pgi.orderItem?.menuNameSnapshot ?? "Menu",
          quantity: pgi.orderItem?.quantity ?? 1,
          allocatedAmount: pgi.allocatedAmount,
          notes: pgi.orderItem?.notes ?? null,
        }));

        const subtotal = itemsList.reduce((acc, it) => acc + (it.allocatedAmount || 0), 0);
        const serviceFee = Math.round(subtotal * 0.03);
        const taxAmount = Math.round(subtotal * 0.10);

        const bill = {
          paymentGroupId: pg.id,
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          tableNumber: ord.session?.table?.tableNumber ?? "Takeaway",
          participantName: pg.participant?.name ?? ord.session?.participants?.[0]?.name ?? "Tamu",
          items: itemsList,
          subtotal,
          serviceFee,
          taxAmount,
          amountDue: pg.amountDue,
          createdAt: ord.createdAt,
        };

        if (query && query.trim()) {
          const q = query.trim().toLowerCase();
          const match =
            bill.orderNumber.toLowerCase().includes(q) ||
            bill.participantName.toLowerCase().includes(q) ||
            bill.tableNumber.toLowerCase().includes(q) ||
            bill.paymentGroupId.toLowerCase().includes(q);
          if (match) pendingBills.push(bill);
        } else {
          pendingBills.push(bill);
        }
      }
    }

    return pendingBills;
  }

  /** Cashier: Look up a specific bill by orderNumber, paymentGroupId, or custom code */
  async lookupCashBill(rawQuery: string) {
    if (!rawQuery || !rawQuery.trim()) {
      throw new BadRequestError("Query parameter is required");
    }

    let clean = rawQuery.trim();
    // Strip prefixes like CSH- if present
    if (clean.toUpperCase().startsWith("CSH-")) {
      clean = clean.slice(4);
    }

    // Try finding by paymentGroup ID first
    let pg = await db.query.paymentGroups.findFirst({
      where: eq(paymentGroups.id, clean),
      with: {
        order: {
          with: {
            session: { with: { table: true, participants: true } },
          },
        },
        participant: true,
        items: { with: { orderItem: true } },
      },
    });

    // If not found, try finding order by orderNumber
    if (!pg) {
      const ord = await db.query.orders.findFirst({
        where: eq(orders.orderNumber, clean),
        with: {
          session: { with: { table: true, participants: true } },
          paymentGroups: {
            with: {
              participant: true,
              items: { with: { orderItem: true } },
            },
          },
        },
      });

      if (ord) {
        // Pick first pending payment group
        pg = ord.paymentGroups.find((g) => g.status !== "PAID") as any;
        if (pg) {
          (pg as any).order = ord;
        }
      }
    }

    if (!pg) {
      throw new NotFoundError(`Tagihan dengan kode atau ID '${rawQuery}' tidak ditemukan`);
    }

    const ord = pg.order;
    const itemsList = (pg.items ?? []).map((pgi: any) => ({
      orderItemId: pgi.orderItemId,
      menuName: pgi.orderItem?.menuNameSnapshot ?? "Menu",
      quantity: pgi.orderItem?.quantity ?? 1,
      allocatedAmount: pgi.allocatedAmount,
      notes: pgi.orderItem?.notes ?? null,
    }));

    const subtotal = itemsList.reduce((acc, it) => acc + (it.allocatedAmount || 0), 0);
    const serviceFee = Math.round(subtotal * 0.03);
    const taxAmount = Math.round(subtotal * 0.10);

    return {
      paymentGroupId: pg.id,
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      tableNumber: ord.session?.table?.tableNumber ?? "Takeaway",
      participantName: pg.participant?.name ?? ord.session?.participants?.[0]?.name ?? "Tamu",
      items: itemsList,
      subtotal,
      serviceFee,
      taxAmount,
      amountDue: pg.amountDue,
      status: pg.status,
      createdAt: ord.createdAt,
    };
  }

  /** Cashier: Confirm cash payment, calculate change, mark as SUCCESS, settle bill */
  async confirmCashierPayment(
    data: { orderId?: string; paymentGroupId?: string; cashReceived: number },
    cashierUser?: { id: string; name: string }
  ) {
    const pGroup = await this.resolvePaymentGroup(data);

    if (pGroup.status === "PAID") {
      throw new BadRequestError("Tagihan ini sudah lunas sebelumnya");
    }

    const requiredAmount = pGroup.amountDue;
    const cashReceived = Number(data.cashReceived);

    if (!cashReceived || cashReceived < requiredAmount) {
      throw new BadRequestError(
        `Uang tunai yang diterima (Rp ${cashReceived}) kurang dari total tagihan (Rp ${requiredAmount})`
      );
    }

    const cashChange = cashReceived - requiredAmount;
    const paymentReference = `CSH-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const newPayment = {
      id: crypto.randomUUID(),
      paymentGroupId: pGroup.id,
      paymentReference,
      paymentMethod: "CASH" as const,
      provider: "CASHIER_POS",
      amount: requiredAmount,
      status: "SUCCESS" as const,
      paidAt: new Date(),
      cashierId: cashierUser?.id ?? null,
      cashReceived,
      cashChange,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(payments).values(newPayment);
    await this.settlePaymentGroup(pGroup, requiredAmount, "CASH");

    // Fetch order details for receipt
    const ord = await db.query.orders.findFirst({
      where: eq(orders.id, pGroup.orderId),
      with: {
        session: { with: { table: true } },
      },
    });

    const participant = await db.query.sessionParticipants.findFirst({
      where: eq(sessionParticipants.id, pGroup.participantId),
    });

    return {
      paymentReference,
      orderId: pGroup.orderId,
      orderNumber: ord?.orderNumber ?? "N/A",
      tableNumber: ord?.session?.table?.tableNumber ?? "Takeaway",
      participantName: participant?.name ?? "Tamu",
      amountDue: requiredAmount,
      cashReceived,
      cashChange,
      paidAt: newPayment.paidAt,
      cashierName: cashierUser?.name ?? "Kasir",
    };
  }

  /** Cashier: View cash transaction history & today's cash totals */
  async getCashierHistory(cashierId?: string) {
    const list = await db.query.payments.findMany({
      where: eq(payments.paymentMethod, "CASH"),
      orderBy: [desc(payments.createdAt)],
      limit: 50,
      with: {
        paymentGroup: {
          with: {
            order: { with: { session: { with: { table: true } } } },
            participant: true,
          },
        },
      },
    });

    // Compute today's total
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let totalCashToday = 0;
    let countToday = 0;

    const formattedTransactions = list.map((p: any) => {
      const isToday = new Date(p.createdAt) >= startOfToday;
      if (isToday && p.status === "SUCCESS") {
        totalCashToday += p.amount;
        countToday += 1;
      }

      return {
        id: p.id,
        paymentReference: p.paymentReference,
        orderId: p.paymentGroup?.orderId,
        orderNumber: p.paymentGroup?.order?.orderNumber ?? "N/A",
        tableNumber: p.paymentGroup?.order?.session?.table?.tableNumber ?? "Takeaway",
        participantName: p.paymentGroup?.participant?.name ?? "Tamu",
        amount: p.amount,
        cashReceived: p.cashReceived ?? p.amount,
        cashChange: p.cashChange ?? 0,
        status: p.status,
        paidAt: p.paidAt ?? p.createdAt,
      };
    });

    return {
      summary: {
        totalCashToday,
        countToday,
      },
      transactions: formattedTransactions,
    };
  }

}

export const paymentService = new PaymentService();
