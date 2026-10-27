import { NextResponse, type NextRequest } from "next/server";
import { applyVerifiedPayment } from "@/features/orders/payment";
import { db } from "@/lib/db/client";
import { paymentEvents } from "@/lib/db/schema";
import { getProviderByName } from "@/lib/payments";

/**
 * Payment provider notifications (refURL_callback).
 *  1. Verify the signature on the raw body. Unsigned/invalid → 401, recorded, ignored.
 *  2. Ask the provider directly for the payment's real status (never trust the body).
 *  3. Apply it idempotently (features/orders/payment.ts).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const provider = getProviderByName((await params).provider);
  if (!provider) return NextResponse.json({ error: "unknown_provider" }, { status: 404 });

  const rawBody = await req.text();
  if (rawBody.length > 100_000) return NextResponse.json({ error: "payload_too_large" }, { status: 413 });

  const notice = await provider.parseWebhook(rawBody, req.headers);
  if (!notice.signatureValid) {
    await db
      .insert(paymentEvents)
      .values({ provider: provider.name, eventKey: `invalid:${notice.eventKey}:${Date.now()}`, kind: "webhook", signatureValid: false, outcome: "INVALID_SIGNATURE", payload: { length: rawBody.length } })
      .onConflictDoNothing();
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  if (!notice.requestId) return NextResponse.json({ ok: true, outcome: "IGNORED" });

  const verified = await provider.verifyPayment(notice.requestId);
  const orderId = verified.orderId ?? notice.orderId;
  // The verified answer and the notification must agree on which order this is.
  if (verified.orderId && notice.orderId && verified.orderId !== notice.orderId) {
    return NextResponse.json({ error: "order_mismatch" }, { status: 400 });
  }
  const outcome = await applyVerifiedPayment(provider, { ...verified, orderId }, notice.eventKey, "webhook");
  return NextResponse.json({ ok: true, outcome });
}
