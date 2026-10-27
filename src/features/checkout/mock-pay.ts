"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPaymentProvider } from "@/lib/payments";
import { MockPaymentProvider } from "@/lib/payments/mock";
import { siteUrl } from "@/lib/seo/metadata";

const input = z.object({
  request: z.string().regex(/^mock_[0-9a-f-]{36}$/),
  outcome: z.enum(["PAID", "FAILED"]),
  returnTo: z.string().max(600),
});

/**
 * Settles a mock payment the way a real provider would: a signed server-to-server
 * callback to the webhook route, then a browser redirect back to the store.
 * Only available while PAYMENT_PROVIDER=mock (which is refused in production).
 */
export async function settleMockPayment(formData: FormData) {
  const provider = getPaymentProvider();
  if (!(provider instanceof MockPaymentProvider)) throw new Error("Mock payments are disabled");

  const parsed = input.parse({ request: formData.get("request"), outcome: formData.get("outcome"), returnTo: formData.get("returnTo") });
  // Only redirect back into our own checkout return page (no open redirect).
  const allowedPrefix = siteUrl("/checkout/return?");
  const returnTo = parsed.returnTo.startsWith(allowedPrefix) ? parsed.returnTo : siteUrl("/");

  const callback = provider.settle(parsed.request, parsed.outcome);
  if (callback) {
    await fetch(siteUrl("/api/payments/mock/webhook"), {
      method: "POST",
      headers: { "content-type": "application/json", "x-mock-signature": callback.signature },
      body: callback.body,
      cache: "no-store",
    });
  }
  redirect(returnTo);
}
