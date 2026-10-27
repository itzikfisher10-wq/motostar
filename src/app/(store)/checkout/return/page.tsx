import { notFound, redirect } from "next/navigation";
import { reconcileOrderPayment } from "@/features/orders/payment";
import { getOrderForCustomer } from "@/features/orders/queries";
import { getPaymentProvider } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * The payment page sends the customer back here. The `status` query parameter is
 * ignored for business logic: if the webhook has not arrived yet, the real status is
 * fetched from the provider server-to-server before showing the order page.
 */
export default async function CheckoutReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  if (!q.order || !q.t) notFound();
  const order = await getOrderForCustomer(q.order, { t: q.t });
  if (!order) notFound();

  if (order.status === "PENDING_PAYMENT") {
    const provider = getPaymentProvider();
    if (provider.name === order.paymentProvider) {
      await reconcileOrderPayment(provider, order.id).catch(() => "PENDING");
    }
  }
  redirect(`/order/${order.id}?t=${encodeURIComponent(q.t)}&from=checkout`);
}
