import Link from "next/link";
import type { VehicleTree } from "@/features/catalog/queries";
import { Container } from "@/components/ui/Container";
import { VehiclePicker } from "@/components/vehicle/VehiclePicker";
import { reveal, revealItem } from "@/components/motion/reveal";

/** "מה הכלי שלך?" — the practical turn after the Arai sequence. */
export function VehicleBand({ tree }: { tree: VehicleTree }) {
  const withParts = tree
    .map((make) => ({ ...make, models: make.models.filter((m) => m.productCount > 0) }))
    .filter((m) => m.models.length > 0);
  return (
    <section aria-labelledby="vehicle-band-title" className="bg-graphite py-16 text-paper lg:py-24">
      <Container>
        <div {...reveal.focus} className="max-w-2xl">
          <h2 id="vehicle-band-title" className="font-display text-display-lg">
            מה הכלי שלך?
          </h2>
          <p className="mt-4 text-lg text-fog">בחרו יצרן ודגם, ותראו רק חלקים שהמוכר ציין שמתאימים לו.</p>
        </div>
        <div {...reveal.panel} className="mt-10">
          <VehiclePicker tree={tree} />
        </div>
        <div {...reveal.cascade} className="mt-12 grid gap-8 md:grid-cols-3">
          {withParts.map((make, i) => (
            <div key={make.slug} {...revealItem(i)}>
              <h3 className="font-display text-[2rem] leading-none">
                <Link href={`/vehicles/${make.slug}`} className="hover:text-signal">{make.name}</Link>
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {make.models.map((m) => (
                  <li key={m.id}>
                    <Link href={`/vehicles/${make.slug}/${m.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-dark px-4 text-sm hover:border-fog">
                      <span className="ltr-isolate">{m.name}</span>
                      <span className="tabular text-fog">{m.productCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
