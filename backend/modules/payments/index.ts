import { Elysia, t } from "elysia";
import { authPlugin } from "../../common/middlewares/auth";
import {
  CreateSnapPaymentDTO,
  MidtransNotificationDTO,
  ProcessPaymentDTO,
  ConfirmCashierPaymentDTO,
} from "./model";
import { paymentService } from "./service";

export const paymentsController = new Elysia({ prefix: "/api/payments" })
  .use(authPlugin)
  .post(
    "/",
    async ({ body, set }) => {
      const payment = await paymentService.processPayment(body);
      set.status = 201;
      return {
        message: "Payment processed successfully",
        data: payment,
      };
    },
    {
      body: ProcessPaymentDTO,
      detail: {
        tags: ["Payments"],
        summary: "Process payment for an order (cash, QRIS, or transfer)",
      },
    },
  )
  .post(
    "/midtrans",
    async ({ body, set }) => {
      const payment = await paymentService.createSnapPayment(body);
      set.status = 201;
      return {
        message: "Midtrans transaction created",
        data: payment,
      };
    },
    {
      body: CreateSnapPaymentDTO,
      detail: {
        tags: ["Payments"],
        summary: "Create Midtrans Snap transaction (returns snapToken & redirectUrl)",
      },
    },
  )
  .post(
    "/midtrans/notification",
    async ({ body }) => {
      const result = await paymentService.handleMidtransNotification(body);
      return { message: "Notification processed", data: result };
    },
    {
      body: MidtransNotificationDTO,
      detail: {
        tags: ["Payments"],
        summary: "Midtrans HTTP notification webhook (called by Midtrans)",
      },
    },
  )
  .post(
    "/midtrans/:reference/sync",
    async ({ params: { reference } }) => {
      const result = await paymentService.syncMidtransStatus(reference);
      return { data: result };
    },
    {
      params: t.Object({ reference: t.String() }),
      detail: {
        tags: ["Payments"],
        summary: "Re-check Midtrans transaction status (useful without public webhook)",
      },
    },
  )
  .get(
    "/cashier/pending",
    async ({ query }) => {
      const q = typeof query?.q === "string" ? query.q : undefined;
      const data = await paymentService.getPendingCashBills(q);
      return { data };
    },
    {
      query: t.Optional(t.Object({ q: t.Optional(t.String()) })),
      detail: {
        tags: ["Cashier POS"],
        summary: "Get list of unpaid bills pending cashier settlement",
      },
    },
  )
  .get(
    "/cashier/lookup/:query",
    async ({ params: { query } }) => {
      const data = await paymentService.lookupCashBill(query);
      return { data };
    },
    {
      params: t.Object({ query: t.String() }),
      detail: {
        tags: ["Cashier POS"],
        summary: "Lookup bill by orderNumber, paymentGroupId, or CSH- code",
      },
    },
  )
  .post(
    "/cashier/confirm",
    async ({ body, user, set }) => {
      const result = await paymentService.confirmCashierPayment(body, user as any);
      set.status = 200;
      return {
        message: "Cash payment confirmed successfully",
        data: result,
      };
    },
    {
      body: ConfirmCashierPaymentDTO,
      detail: {
        tags: ["Cashier POS"],
        summary: "Cashier confirms cash received, computes change, and completes payment",
      },
    },
  )
  .get(
    "/cashier/history",
    async ({ user }) => {
      const data = await paymentService.getCashierHistory(user?.id);
      return { data };
    },
    {
      detail: {
        tags: ["Cashier POS"],
        summary: "Get cashier transactions history and daily cash totals",
      },
    },
  )
  .get(
    "/:orderId",
    async ({ params: { orderId } }) => {
      const payment = await paymentService.getByOrderId(orderId);
      return { data: payment };
    },
    {
      params: t.Object({
        orderId: t.String(),
      }),
      detail: {
        tags: ["Payments"],
        summary: "Get payment details by order id",
      },
    },
  );
