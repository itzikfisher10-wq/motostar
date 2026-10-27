import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getVehicleTree } from "@/features/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;
type Props = { params: Promise<{ make: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug } = await params;
  const make = (await getVehicleTree()).find((m) => m.slug === makeSlug);
  if (!make) return {};
  return buildMetadata({
    title: `חלקים ל-${make.name}`,
    description: `חלקי חילוף ואביזרים לדגמי ${make.name} (${make.nameHe}): ${make.models.map((m) => m.name).join(", ") || "בקרוב"}.`,
    path: `/vehicles/${make.slug}`,
    noindex: make.models.every((m) => m.productCount === 0),
  });
}

export default async function MakePage({ params }: Props) {
  const { make: makeSlug } = await params;
  const make = (await getVehicleTree()).find((m) => m.slug === makeSlug);
  if (!make) notFound();
  return (
    <Container className="pb-24 pt-8">
      <Breadcrumbs items={[{ name: "האופנוע שלי", href: "/vehicles" }, { name: make.name, href: `/vehicles/${make.slug}` }]} />
      <h1 className="mt-8 font-display text-display-lg">חלקים ל-{make.name}</h1>
      {make.models.length ? (
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {make.models.map((m) => (
            <li key={m.id}>
              <Link href={`/vehicles/${make.slug}/${m.slug}`} className="flex h-20 items-center justify-between rounded-[var(--radius-panel)] border border-line px-5 hover:border-ink">
                <span className="font-display text-[2rem] leading-none ltr-isolate">{m.name}</span>
                <span className="text-sm text-steel tabular">{m.productCount} מוצרים</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 max-w-xl text-lg text-steel">עדיין אין בקטלוג חלקים עם התאמה מוצהרת לדגמי {make.name}. שלחו לנו את הדגם והשנה בוואטסאפ ונבדוק עבורכם.</p>
      )}
    </Container>
  );
}
