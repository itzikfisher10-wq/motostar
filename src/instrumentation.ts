/**
 * Runs once when the server starts. Fails fast on a bad configuration (missing secrets,
 * test/sandbox payments on a production site) instead of failing later at checkout.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("@/config/env");
  const { getPaymentProvider, testPaymentsAllowed } = await import("@/lib/payments");
  env();
  const provider = getPaymentProvider();
  if (!provider.live && process.env.NODE_ENV === "production") {
    // A sandbox accepts public test cards: on a real site that would create "paid" orders for free.
    if (!testPaymentsAllowed()) throw new Error(`Payment provider "${provider.name}" is in test/sandbox mode. Configure live payment credentials (see docs/payments.md).`);
    console.warn(`⚠ Payments are in TEST mode (${provider.name}). No real charges will be made.`);
  }
}
