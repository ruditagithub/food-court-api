import { Elysia, t } from "elysia";
import { authPlugin } from "../../common/middlewares/auth";
import { ProcessPaymentDTO } from "./model";
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
