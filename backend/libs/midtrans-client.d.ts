// Minimal typings for the untyped `midtrans-client` package (only what we use).
declare module "midtrans-client" {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  export interface MidtransTransactionStatus {
    order_id: string;
    status_code: string;
    gross_amount: string;
    transaction_status: string;
    fraud_status?: string;
    payment_type?: string;
    signature_key?: string;
  }

  class Snap {
    constructor(config: MidtransConfig);
    createTransaction(
      parameter: object,
    ): Promise<{ token: string; redirect_url: string }>;
    transaction: {
      status(orderId: string): Promise<MidtransTransactionStatus>;
    };
  }

  const midtransClient: { Snap: typeof Snap };
  export default midtransClient;
}
