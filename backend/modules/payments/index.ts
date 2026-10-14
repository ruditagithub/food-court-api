import { Elysia, t } from "elysia";
import { authPlugin } from "../../common/middlewares/auth";
import {
  CreateSnapPaymentDTO,
  MidtransNotificationDTO,
  ProcessPaymentDTO,
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
