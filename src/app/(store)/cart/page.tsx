import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/CartPageView";
import { Container } from "@/components/ui/Container";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({ title: "סל הקניות", description: "סל הקניות שלך ב-Moto Star.", path: "/cart", noindex: true });

export default function CartPage() {
  return (
    <Container className="py-10 lg:py-14">
      <h1 className="font-display text-display-md">סל הקניות</h1>
      <div className="mt-8">
        <CartPageView />
      </div>
    </Container>
  );
}
