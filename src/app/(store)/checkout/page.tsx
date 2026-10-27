import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { buttonClass } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { buildCartView, readCartId } from "@/features/cart/service";
import { getActiveShippingMethods } from "@/features/checkout/shipping";
import { getPaymentProvider } from "@/lib/payments";
import { buildMetadata } from "@/lib/seo/metadata";
import { reveal } from "@/components/motion/reveal";

export const metadata: Metadata = buildMetadata({ title: "קופה", description: "השלמת הזמנה ב-Moto Star.", path: "/checkout", noindex: true });
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [cart, methods] = await Promise.all([buildCartView(await readCartId()), getActiveShippingMethods()]);
  const provider = getPaymentProvider();

  return (
    <Container className="py-10 lg:py-14">
      <h1 {...reveal.focus} className="font-display text-display-md">קופה</h1>
      {cart.lines.length === 0 ? (
        <div className="py-16">
          <p className="text-lg">הסל ריק, אין מה לשלם עליו עדיין.</p>
          <Link href="/products" className={buttonClass("dark", "md", "mt-6")}>
            לכל המוצרים
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <CheckoutForm cart={cart} methods={methods} testMode={!provider.live} />
        </div>
      )}
    </Container>
  );
}
