import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { JsonLd } from "@/components/seo/JsonLd";
import { RevealObserver } from "@/components/motion/RevealObserver";
import { getCategoryTree } from "@/features/catalog/queries";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoryTree();
  return (
    <CartProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[60] focus:rounded-md focus:bg-paper focus:px-4 focus:py-2 focus:text-ink">
        דילוג לתוכן הראשי
      </a>
      <Header categories={categories} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer categories={categories} />
      <CartDrawer />
      <RevealObserver />
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
    </CartProvider>
  );
}
