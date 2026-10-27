import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { VehiclePicker } from "@/components/vehicle/VehiclePicker";
import { getVehicleTree } from "@/features/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { reveal, revealItem } from "@/components/motion/reveal";

export const revalidate = 300;
export const metadata = buildMetadata({
  title: "חלקים לפי דגם אופנוע",
  description: "בחרו יצרן ודגם (Yamaha XMAX, TMAX, SYM Joyride, Kymco Downtown ועוד) וראו את החלקים שמתאימים לאופנוע או לקטנוע שלכם.",
  path: "/vehicles",
});

export default async function VehiclesPage() {
  const tree = await getVehicleTree();
  return (
    <Container className="pb-24 pt-8">
      <Breadcrumbs items={[{ name: "האופנוע שלי", href: "/vehicles" }]} />
      <h1 {...reveal.focus} className="mt-8 font-display text-display-lg">חלקים לפי דגם</h1>
      <p className="mt-4 max-w-2xl text-lg text-steel">בחרו יצרן ודגם. נציג רק מוצרים שבתיאור שלהם צוין שהם מתאימים לדגם הזה.</p>
      <div {...reveal.panel} className="mt-10 rounded-[var(--radius-panel)] bg-ink p-5 sm:p-8">
        <VehiclePicker tree={tree} />
      </div>
      <div {...reveal.cascade} className="mt-14 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
        {tree.map((make, i) => (
          <section key={make.slug} {...revealItem(i)} aria-labelledby={`make-${make.slug}`}>
            <h2 id={`make-${make.slug}`} className="border-b border-ink pb-3 font-display text-display-sm">
              <Link href={`/vehicles/${make.slug}`} className="hover:text-signal">{make.name}</Link>
            </h2>
            {make.models.length ? (
              <ul className="mt-2 divide-y divide-line">
                {make.models.map((m) => (
                  <li key={m.id}>
                    <Link href={`/vehicles/${make.slug}/${m.slug}`} className="flex h-12 items-center justify-between hover:underline underline-offset-4">
                      <span className="ltr-isolate">{m.name}</span>
                      <span className="text-sm text-steel tabular">{m.productCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-steel">עדיין אין חלקים עם התאמה מוצהרת לדגמי {make.name}. שאלו אותנו בוואטסאפ.</p>
            )}
          </section>
        ))}
      </div>
    </Container>
  );
}
