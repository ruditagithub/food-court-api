import { t } from "elysia";

export const ProcessPaymentDTO = t.Object({
  orderId: t.String(),
  paymentMethod: t.Union([
    t.Literal("cash"),
    t.Literal("qris"),
    t.Literal("transfer"),
  ]),
  amount: t.Optional(t.Integer({ minimum: 1 })),
});

export type ProcessPaymentDTOType = typeof ProcessPaymentDTO.static;
