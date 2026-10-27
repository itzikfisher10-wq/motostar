import { afterEach, describe, expect, it, vi } from "vitest";
import { PayPlusProvider } from "@/lib/payments/payplus";

const provider = new PayPlusProvider({ apiKey: "k", secretKey: "s3cret", paymentPageUid: "page", baseUrl: "https://restapidev.payplus.co.il" });
const headers = (hash: string, ua = "PayPlus") => new Headers({ hash, "user-agent": ua });

describe("PayPlus callback signature", () => {
  const body = { transaction: { uid: "tx-1", payment_page_request_uid: "req-1", more_info: "11111111-1111-4111-8111-111111111111", status_code: "000" } };

  it("accepts the signature over the raw body", async () => {
    const raw = JSON.stringify(body);
    const n = await provider.parseWebhook(raw, headers(provider.sign(raw)));
    expect(n.signatureValid).toBe(true);
    expect(n.requestId).toBe("req-1");
    expect(n.orderId).toBe(body.transaction.more_info);
    expect(n.eventKey).toBe("tx-1");
  });

  it("accepts PayPlus' reference signing (JSON.stringify of the parsed body)", async () => {
    const raw = JSON.stringify(body, null, 2); // different whitespace on the wire
    const n = await provider.parseWebhook(raw, headers(provider.sign(JSON.stringify(body))));
    expect(n.signatureValid).toBe(true);
  });

  it("rejects a wrong signature, a wrong user-agent and invalid JSON", async () => {
    const raw = JSON.stringify(body);
    expect((await provider.parseWebhook(raw, headers("forged"))).signatureValid).toBe(false);
    expect((await provider.parseWebhook(raw, headers(provider.sign(raw), "curl"))).signatureValid).toBe(false);
    expect((await provider.parseWebhook("not json", headers(provider.sign("not json")))).signatureValid).toBe(false);
  });
});

describe("PayPlus status check (IPN)", () => {
  afterEach(() => vi.unstubAllGlobals());
  const reply = (status: number, json: unknown) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(json), { status })));

  it("maps an approved transaction to PAID with the amount in agorot", async () => {
    reply(200, { results: { status: "success" }, data: { status_code: "000", amount: 129.9, currency_code: "ILS", more_info: "o-1", transaction_uid: "t-1" } });
    expect(await provider.verifyPayment("req")).toMatchObject({ status: "PAID", amountAgorot: 12990, currency: "ILS", orderId: "o-1", transactionId: "t-1" });
  });

  it("treats errors and missing data as PENDING, never PAID", async () => {
    reply(500, {});
    expect((await provider.verifyPayment("req")).status).toBe("PENDING");
    reply(200, { results: { status: "error" }, data: { status_code: "000", amount: 10 } });
    expect((await provider.verifyPayment("req")).status).toBe("PENDING");
    reply(200, { results: { status: "success" }, data: {} });
    expect((await provider.verifyPayment("req")).status).toBe("PENDING");
  });

  it("maps a declined transaction to FAILED", async () => {
    reply(200, { results: { status: "success" }, data: { status_code: "004", amount: 10 } });
    expect((await provider.verifyPayment("req")).status).toBe("FAILED");
  });
});
