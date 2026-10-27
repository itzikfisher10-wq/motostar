import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { agorotToDecimal } from "@/lib/format/money";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, VerifiedPayment, WebhookNotice } from "./types";

/**
 * PayPlus (https://www.payplus.co.il) hosted payment page.
 *
 * Flow:
 *  1. POST /api/v1.0/PaymentPages/generateLink → redirect the customer to payment_page_link.
 *     The card is entered on PayPlus' page; card data never touches our servers.
 *  2. PayPlus calls refURL_callback (our webhook). The request is authenticated with an
 *     HMAC-SHA256 (base64) of the body using our secret key, sent in the `hash` header,
 *     with user-agent "PayPlus".
 *  3. We do NOT trust the callback body for the payment outcome. We call
 *     /api/v1.0/PaymentPages/ipn with the page_request_uid and use that answer.
 *
 * Docs: https://docs.payplus.co.il/reference/validate-requests-received-from-payplus
 *       https://docs.payplus.co.il/reference/post_paymentpages-generatelink
 *
 * ⚠ Field names below follow PayPlus' published API. Before going live, run the full
 *   flow against the PayPlus sandbox (PAYPLUS_BASE_URL=https://restapidev.payplus.co.il)
 *   with your own credentials — see docs/payments.md → "Go-live checklist".
 */
export class PayPlusProvider implements PaymentProvider {
  readonly name = "payplus";
  readonly live: boolean;

  constructor(private readonly cfg: { apiKey: string; secretKey: string; paymentPageUid: string; baseUrl: string }) {
    this.live = !cfg.baseUrl.includes("restapidev");
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      // PayPlus authenticates REST calls with these two headers.
      "api-key": this.cfg.apiKey,
      "secret-key": this.cfg.secretKey,
    };
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const body = {
      payment_page_uid: this.cfg.paymentPageUid,
      charge_method: 1, // J4: immediate charge
      amount: Number(agorotToDecimal(input.amountAgorot)),
      currency_code: input.currency,
      language_code: "he",
      sendEmailApproval: true,
      sendEmailFailure: false,
      refURL_success: input.urls.success,
      refURL_failure: input.urls.failure,
      refURL_cancel: input.urls.cancel,
      refURL_callback: input.urls.callback,
      send_failure_callback: true,
      expiry_datetime: "30",
      more_info: input.orderId,
      more_info_2: String(input.orderNumber),
      customer: { customer_name: input.customer.name, email: input.customer.email, phone: input.customer.phone },
      items: [
        ...input.items.map((i) => ({ name: i.name.slice(0, 100), quantity: i.quantity, price: Number(agorotToDecimal(i.unitPriceAgorot)), vat_type: 0 })),
        ...(input.shipping.amountAgorot > 0 ? [{ name: input.shipping.name, quantity: 1, price: Number(agorotToDecimal(input.shipping.amountAgorot)), vat_type: 0, shipping: true }] : []),
      ],
    };
    const res = await fetch(`${this.cfg.baseUrl}/api/v1.0/PaymentPages/generateLink`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => null)) as { results?: { status?: string; description?: string }; data?: { payment_page_link?: string; page_request_uid?: string } } | null;
    if (!res.ok || json?.results?.status !== "success" || !json.data?.payment_page_link || !json.data.page_request_uid) {
      throw new Error(`PayPlus generateLink failed (${res.status}): ${json?.results?.description ?? "unknown error"}`);
    }
    return { redirectUrl: json.data.payment_page_link, requestId: json.data.page_request_uid };
  }

  async parseWebhook(rawBody: string, headers: Headers): Promise<WebhookNotice> {
    let payload: Record<string, unknown> = {};
    let parsedOk = false;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
      parsedOk = true;
    } catch {
      /* invalid JSON: nothing to process */
    }
    // PayPlus' reference code signs JSON.stringify(body). Accept a signature over the raw
    // bytes or over that re-serialization — both require the secret key.
    const given = headers.get("hash") ?? "";
    const candidates = [rawBody, ...(parsedOk ? [JSON.stringify(payload)] : [])];
    const signatureValid = (headers.get("user-agent") ?? "") === "PayPlus" && parsedOk && candidates.some((body) => this.matches(given, body));

    const tx = (payload.transaction ?? {}) as Record<string, unknown>;
    const requestId = str(tx.payment_page_request_uid) ?? str(payload.page_request_uid) ?? str(payload.payment_page_request_uid);
    const orderId = str(tx.more_info) ?? str(payload.more_info);
    const eventKey = str(tx.uid) ?? (requestId ? `${requestId}:${str(tx.status_code) ?? "?"}` : createHmac("sha256", "evt").update(rawBody).digest("hex"));
    return { signatureValid, eventKey, requestId, orderId, payload };
  }

  /** HMAC-SHA256 (base64) of `body` with the secret key, compared in constant time. */
  sign(body: string): string {
    return createHmac("sha256", this.cfg.secretKey).update(body).digest("base64");
  }

  private matches(given: string, body: string): boolean {
    const a = Buffer.from(given);
    const b = Buffer.from(this.sign(body));
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async verifyPayment(requestId: string): Promise<VerifiedPayment> {
    const res = await fetch(`${this.cfg.baseUrl}/api/v1.0/PaymentPages/ipn`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ payment_request_uid: requestId }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => null)) as { results?: { status?: string }; data?: Record<string, unknown> } | null;
    const d = json?.data ?? {};
    const statusCode = str(d.status_code);
    const amount = typeof d.amount === "number" ? d.amount : typeof d.amount === "string" ? Number(d.amount) : null;
    return {
      status: !res.ok || json?.results?.status !== "success" ? "PENDING" : statusCode === "000" ? "PAID" : statusCode ? "FAILED" : "PENDING",
      orderId: str(d.more_info),
      amountAgorot: amount !== null && Number.isFinite(amount) ? Math.round(amount * 100) : null,
      currency: str(d.currency_code) ?? str(d.currency),
      transactionId: str(d.transaction_uid) ?? str(d.uid),
      requestId,
      raw: d,
    };
  }
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : typeof v === "number" ? String(v) : null;
}
