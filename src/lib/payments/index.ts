import "server-only";
import { env } from "@/config/env";
import { MockPaymentProvider } from "./mock";
import { PayPlusProvider } from "./payplus";
import type { PaymentProvider } from "./types";

let instance: PaymentProvider | undefined;

/** The configured payment provider (PAYMENT_PROVIDER). The mock provider can never run in production. */
export function getPaymentProvider(): PaymentProvider {
  if (instance) return instance;
  const e = env();
  if (e.PAYMENT_PROVIDER === "payplus") {
    instance = new PayPlusProvider({
      apiKey: e.PAYPLUS_API_KEY!,
      secretKey: e.PAYPLUS_SECRET_KEY!,
      paymentPageUid: e.PAYPLUS_PAYMENT_PAGE_UID!,
      baseUrl: e.PAYPLUS_BASE_URL!,
    });
  } else {
    if (e.NODE_ENV === "production" && !testPaymentsAllowed()) {
      throw new Error("PAYMENT_PROVIDER=mock is not allowed in production. Configure a real payment provider.");
    }
    instance = new MockPaymentProvider(e.APP_SECRET);
  }
  return instance;
}

/**
 * Test payments (mock provider or a payment sandbox) on a production build are allowed only
 * with ALLOW_TEST_PAYMENTS=true AND a non-public site address (localhost or a *.vercel.app
 * preview), so they can never be switched on for the real domain by mistake.
 */
export function testPaymentsAllowed(): boolean {
  if (process.env.ALLOW_TEST_PAYMENTS !== "true") return false;
  try {
    const host = new URL(env().NEXT_PUBLIC_SITE_URL).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export function getProviderByName(name: string): PaymentProvider | null {
  const p = getPaymentProvider();
  return p.name === name ? p : null;
}

export type { PaymentProvider } from "./types";
