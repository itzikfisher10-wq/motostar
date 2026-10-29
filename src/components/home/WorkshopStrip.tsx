import Link from "next/link";
import { site, whatsappLink } from "@/config/site";
import { CardIcon, ClockIcon, PhoneIcon, ReturnIcon, StoreIcon, WhatsappIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/Button";
import { workshop } from "@/content/home";
import { reveal, revealItem } from "@/components/motion/reveal";

/**
 * Who is behind the store, in their own words (from the original About page), and the practical
 * facts, each from src/config/site.ts. No invented numbers. Last section before the footer.
 */
export function WorkshopStrip() {
  const facts = [
    { icon: <StoreIcon size={20} />, title: "איסוף עצמי בחולון", note: `${site.address.street}, בתיאום מראש` },
    { icon: <ReturnIcon size={20} />, title: `החזרה תוך ${site.returnsDays} יום`, note: "ממועד קבלת המוצר" },
    { icon: <CardIcon size={20} />, title: "תשלום מאובטח", note: `ב${site.paymentMethods.join(", ")}` },
    {
      icon: <ClockIcon size={20} />,
      title: "שעות פעילות",
      note: site.hours.map((h) => (
        <span key={h.days} className="block">
          {h.days} <bdi dir="ltr" className="tabular">{h.open}–{h.close}</bdi>
        </span>
      )),
    },
  ];
  return (
    <section data-sheet data-lazy-paint aria-labelledby="workshop-title" className="bg-paper pb-20 pt-4 lg:pb-28">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-mist px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 end-[-6rem] h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgb(225_18_26/0.12),transparent)]" />
          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
            <div {...reveal.focus}>
              <p className="text-sm font-black tracking-wide text-signal-deep">{workshop.eyebrow}</p>
              <h2 id="workshop-title" className="mt-1.5 font-display text-display-lg">
                {workshop.title}
              </h2>
              <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-steel">{workshop.body}</p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                <a href={whatsappLink("היי, אני רוצה לבדוק התאמה של חלק")} target="_blank" rel="noopener noreferrer" className={buttonClass("dark", "lg")}>
                  <WhatsappIcon size={20} />
                  {workshop.cta}
                </a>
                <a href={`tel:${site.phoneE164}`} className={buttonClass("glassLight", "lg")}>
                  <PhoneIcon size={20} />
                  <span className="tabular ltr-isolate">{site.phone}</span>
                </a>
                <Link href="/about" className={buttonClass("ghost", "lg", "hover:bg-white")}>
                  {workshop.more}
                </Link>
              </div>
            </div>
            <ul {...reveal.cascade} className="grid gap-2.5 sm:grid-cols-2">
              {facts.map((f, i) => (
                <li key={f.title} {...revealItem(i)} className="glass-light flex items-start gap-3 rounded-2xl p-4">
                  <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-paper">
                    {f.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black leading-tight">{f.title}</span>
                    <span className="mt-1 block text-sm leading-snug text-steel">{f.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
