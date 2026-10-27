import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { settleMockPayment } from "@/features/checkout/mock-pay";
import { formatPrice } from "@/lib/format/money";
import { getPaymentProvider } from "@/lib/payments";

export const metadata: Metadata = { title: "דף תשלום לבדיקה", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Stand-in for a provider's hosted payment page, used only with PAYMENT_PROVIDER=mock.
 * No card details are requested and no money moves.
 */
export default async function MockPayPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (getPaymentProvider().name !== "mock") notFound();
  const q = await searchParams;
  if (!q.request || !q.amount || !q.success || !q.failure) notFound();
  const amount = Number(q.amount);

  return (
    <Container className="max-w-xl py-16">
      <p className="rounded-[var(--radius-control)] border-2 border-dashed border-warn bg-[#fff8ec] px-4 py-3 text-sm font-medium text-warn" role="note">
        דף תשלום לבדיקה בלבד. לא מוזנים פרטי כרטיס ולא מתבצע חיוב.
      </p>
      <h1 className="mt-8 font-display text-display-md">אישור תשלום (בדיקה)</h1>
      <p className="mt-4 text-lg">
        סכום לחיוב: <strong className="tabular">{Number.isFinite(amount) ? formatPrice(amount) : "?"}</strong>
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <form action={settleMockPayment}>
          <input type="hidden" name="request" value={q.request} />
          <input type="hidden" name="returnTo" value={q.success} />
          <input type="hidden" name="outcome" value="PAID" />
          <Button type="submit" variant="primary" size="lg">
            סימולציית תשלום מוצלח
          </Button>
        </form>
        <form action={settleMockPayment}>
          <input type="hidden" name="request" value={q.request} />
          <input type="hidden" name="returnTo" value={q.failure} />
          <input type="hidden" name="outcome" value="FAILED" />
          <Button type="submit" variant="outline" size="lg">
            סימולציית תשלום שנכשל
          </Button>
        </form>
      </div>
    </Container>
  );
}
