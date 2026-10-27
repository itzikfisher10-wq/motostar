import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, VerifiedPayment, WebhookNotice } from "./types";

/**
 * Development / automated-test payment provider. Moves no money.
 * Refused when NODE_ENV=production (see ./index.ts).
 *
 * It behaves like a real hosted page so the whole order flow is exercised:
 * the "payment page" (/checkout/mock-pay) posts a signed callback to the same
 * webhook route a real provider uses, and verifyPayment answers from an in-memory ledger.
 */
type LedgerEntry = { orderId: string; amountAgorot: number; status: "PENDING" | "PAID" | "FAILED"; transactionId: string | null };

declare global {
  var __mockPaymentLedger: Map<string, LedgerEntry> | undefined;
}
const ledger = (globalThis.__mockPaymentLedger ??= new Map<string, LedgerEntry>());

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  readonly live = false;
  constructor(private readonly secret: string) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const requestId = `mock_${randomUUID()}`;
    ledger.set(requestId, { orderId: input.orderId, amountAgorot: input.amountAgorot, status: "PENDING", transactionId: null });
    const q = new URLSearchParams({ request: requestId, order: input.orderId, amount: String(input.amountAgorot), success: input.urls.success, failure: input.urls.failure });
    return { redirectUrl: `/checkout/mock-pay?${q}`, requestId };
  }

  /** Called by the mock payment page to settle a request. */
  settle(requestId: string, outcome: "PAID" | "FAILED"): { body: string; signature: string } | null {
    const entry = ledger.get(requestId);
    if (!entry || entry.status !== "PENDING") return null;
    entry.status = outcome;
    entry.transactionId = outcome === "PAID" ? `mocktx_${randomUUID()}` : null;
    const body = JSON.stringify({ request_id: requestId, order_id: entry.orderId, status: outcome, transaction_id: entry.transactionId });
    return { body, signature: this.sign(body) };
  }

  sign(body: string) {
    return createHmac("sha256", this.secret).update(body).digest("base64");
  }

  async parseWebhook(rawBody: string, headers: Headers): Promise<WebhookNotice> {
    const given = Buffer.from(headers.get("x-mock-signature") ?? "");
    const expected = Buffer.from(this.sign(rawBody));
    const signatureValid = given.length === expected.length && timingSafeEqual(given, expected);
    let payload: Record<string, string | null> = {};
    try {
      payload = JSON.parse(rawBody) as Record<string, string | null>;
    } catch {
      /* ignored */
    }
    return {
      signatureValid,
      eventKey: `${payload.request_id ?? "?"}:${payload.status ?? "?"}`,
      requestId: payload.request_id ?? null,
      orderId: payload.order_id ?? null,
      payload,
    };
  }

  async verifyPayment(requestId: string): Promise<VerifiedPayment> {
    const e = ledger.get(requestId);
    if (!e) return { status: "PENDING", orderId: null, amountAgorot: null, currency: null, transactionId: null, requestId, raw: null };
    return { status: e.status, orderId: e.orderId, amountAgorot: e.amountAgorot, currency: "ILS", transactionId: e.transactionId, requestId, raw: { ...e } };
  }
}
