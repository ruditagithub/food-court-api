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

export const CreateSnapPaymentDTO = t.Object({
  orderId: t.Optional(t.String()),
  paymentGroupId: t.Optional(t.String()),
});

export type CreateSnapPaymentDTOType = typeof CreateSnapPaymentDTO.static;

// Midtrans sends many more fields; we only validate the ones we rely on.
export const MidtransNotificationDTO = t.Object(
  {
    order_id: t.String(),
    status_code: t.String(),
    gross_amount: t.String(),
    signature_key: t.String(),
    transaction_status: t.String(),
    fraud_status: t.Optional(t.String()),
    payment_type: t.Optional(t.String()),
  },
  { additionalProperties: true },
);

export const ConfirmCashierPaymentDTO = t.Object({
  orderId: t.Optional(t.String()),
  paymentGroupId: t.Optional(t.String()),
  cashReceived: t.Integer({ minimum: 1 }),
});

export type ConfirmCashierPaymentDTOType = typeof ConfirmCashierPaymentDTO.static;
