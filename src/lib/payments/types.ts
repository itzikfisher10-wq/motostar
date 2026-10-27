/**
 * Payment provider contract. To switch providers (e.g. Cardcom, Tranzila, Grow),
 * implement this interface in a new file and register it in ./index.ts.
 * See docs/payments.md.
 */
export type CreatePaymentInput = {
  orderId: string;
  orderNumber: number;
  amountAgorot: number;
  currency: "ILS";
  customer: { name: string; email: string; phone: string };
  items: { name: string; quantity: number; unitPriceAgorot: number }[];
  shipping: { name: string; amountAgorot: number };
  urls: { success: string; failure: string; cancel: string; callback: string };
};

export type CreatePaymentResult = { redirectUrl: string; requestId: string };

/** Result of checking a payment directly with the provider (server-to-server). */
export type VerifiedPayment = {
  status: "PAID" | "FAILED" | "PENDING";
  orderId: string | null;
  amountAgorot: number | null;
  currency: string | null;
  transactionId: string | null;
  requestId: string | null;
  raw: unknown;
};

/** What the provider told us in a webhook, after signature verification. */
export type WebhookNotice = {
  signatureValid: boolean;
  /** Unique per notification, used to make processing idempotent. */
  eventKey: string;
  requestId: string | null;
  orderId: string | null;
  payload: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  /** True when this provider can move real money. */
  readonly live: boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** Verifies the webhook signature and extracts identifiers. Never trusts the body without a valid signature. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookNotice>;
  /** Asks the provider for the authoritative state of a payment request. */
  verifyPayment(requestId: string): Promise<VerifiedPayment>;
}
