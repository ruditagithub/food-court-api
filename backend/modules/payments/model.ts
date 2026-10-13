import { t } from "elysia";

export const ProcessPaymentDTO = t.Object({
  orderId: t.Optional(t.String()),
  paymentGroupId: t.Optional(t.String()),
  paymentMethod: t.Union([
    t.Literal("cash"),
    t.Literal("qris"),
    t.Literal("transfer"),
    t.Literal("card"),
    t.Literal("QRIS"),
    t.Literal("CASH"),
    t.Literal("CARD"),
    t.Literal("E_WALLET"),
    t.Literal("BANK_TRANSFER"),
  ]),
  amount: t.Optional(t.Integer({ minimum: 1 })),
  provider: t.Optional(t.String()),
});

export type ProcessPaymentDTOType = typeof ProcessPaymentDTO.static;
