import { createHash } from "node:crypto";
import midtransClient, {
  type MidtransTransactionStatus,
} from "midtrans-client";
import { AppError } from "../common/errors";
import { env } from "../config/env";

export type { MidtransTransactionStatus };

export const snap = new midtransClient.Snap({
  isProduction: env.MIDTRANS_IS_PRODUCTION,
  serverKey: env.MIDTRANS_SERVER_KEY,
  clientKey: env.MIDTRANS_CLIENT_KEY,
});

export function assertMidtransConfigured() {
  if (!env.MIDTRANS_SERVER_KEY || !env.MIDTRANS_CLIENT_KEY) {
    throw new AppError(
      "Midtrans is not configured. Set MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY.",
      500,
    );
  }
}

/** Midtrans signature: SHA512(order_id + status_code + gross_amount + serverKey) */
export function isValidSignature(n: MidtransTransactionStatus): boolean {
  const expected = createHash("sha512")
    .update(n.order_id + n.status_code + n.gross_amount + env.MIDTRANS_SERVER_KEY)
    .digest("hex");
  return expected === n.signature_key;
}

export type GatewayPaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED";

// https://docs.midtrans.com/docs/https-notification-webhooks#transaction-status
export function mapTransactionStatus(
  s: MidtransTransactionStatus,
): GatewayPaymentStatus {
  switch (s.transaction_status) {
    case "capture":
      return s.fraud_status === "accept" ? "SUCCESS" : "PENDING";
    case "settlement":
      return "SUCCESS";
    case "deny":
    case "cancel":
    case "failure":
      return "FAILED";
    case "expire":
      return "EXPIRED";
    case "refund":
    case "partial_refund":
      return "REFUNDED";
    default:
      return "PENDING";
  }
}

export type PaymentMethodEnum =
  | "QRIS"
  | "CASH"
  | "CARD"
  | "E_WALLET"
  | "BANK_TRANSFER";

export function mapPaymentType(type?: string): PaymentMethodEnum {
  switch (type) {
    case "credit_card":
      return "CARD";
    case "gopay":
    case "shopeepay":
      return "E_WALLET";
    case "bank_transfer":
    case "echannel":
    case "permata":
      return "BANK_TRANSFER";
    default:
      return "QRIS";
  }
}
