"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { whatsappLink } from "@/config/site";
import { WhatsappIcon } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/Button";
import { useScrollScene } from "@/components/motion/useScrollScene";

export type ShelfItem = {
  slug: string;
  name: string;
  count: number;
  example: { title: string; image: { url: string; alt: string } };
};

type Props = {
  copy: { title: string; intro: string; exampleLabel: string; closingTitle: string; closingBody: string; closingCta: string; allCta: string };
  items: ShelfItem[];
};

/**
 * "The shelf": vertical scroll drives a lateral pass across the real categories (a `pan` act).
 * The stage pins and the rail travels exactly its overflow, so the last card lands flush.
 * Product photos drift slightly against the rail for depth. Every label is a fact from the
 * catalog: category, product count, one real product as an example.
 * Without JS / reduced motion: the rail is a native horizontal scroller with snap points.
 */
export function ShelfPan({ copy, items }: Props) {
  const root = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);

  useScrollScene(
    root,
    (el, { gsap, headerHeight, priority }) => {
      const stage = el.querySelector<HTMLElement>("[data-stage]");
      const rail = el.querySelector<HTMLElement>("[data-rail]");
      if (!stage || !rail) return;
      // RTL: the rail overflows to the left, so it travels right (+x) to bring the rest in.
      const travel = () => Math.max(0, rail.scrollWidth - stage.clientWidth);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: () => `top ${headerHeight()}px`,
          end: () => `+=${travel() * 1.1}`,
          pin: true,
          scrub: 0.6,
          refreshPriority: priority,
          invalidateOnRefresh: true,
        },
      });
      tl.to(rail, { x: () => travel(), ease: "none" }, 0);
      tl.to(el.querySelectorAll("[data-shelf-photo]"), { xPercent: 9, ease: "none" }, 0);
    },
    () => setArmed(true),
  );

  return (
    <section ref={root} aria-labelledby="shelf-title" className="bg-mist">
      <div data-stage className={`flex flex-col justify-center overflow-hidden py-14 ${armed ? "min-h-[calc(100svh-6rem)]" : ""}`}>
        <ul
          data-rail
          className={`flex gap-5 px-4 sm:px-6 lg:gap-8 lg:px-10 ${armed ? "w-max" : "scrollbar-none snap-x snap-mandatory overflow-x-auto pb-4"}`}
        >
          <li className="flex w-[min(84vw,30rem)] shrink-0 snap-start flex-col justify-end pe-4 lg:pe-10">
            <h2 id="shelf-title" className="font-display text-[clamp(5rem,3rem+9vw,11rem)] leading-[0.8]">
              {copy.title}
            </h2>
            <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-steel">{copy.intro}</p>
            <Link href="/categories" className="mt-6 self-start text-sm font-semibold underline underline-offset-4 hover:text-signal">
              {copy.allCta}
            </Link>
          </li>

          {items.map((item) => (
            <li key={item.slug} className="w-[min(78vw,24rem)] shrink-0 snap-start">
              <Link href={`/categories/${item.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-panel)] bg-paper">
                  <div data-shelf-photo className="absolute inset-[10%]">
                    <Image
                      src={item.example.image.url}
                      alt={item.example.image.alt}
                      fill
                      sizes="(min-width: 1024px) 24rem, 78vw"
                      className="object-contain transition-transform duration-700 ease-[var(--ease-out-quart)] [@media(hover:hover)]:group-hover:scale-[1.05]"
                    />
                  </div>
                </div>
                <h3 className="mt-5 font-display text-[2.6rem] leading-none transition-colors group-hover:text-signal">{item.name}</h3>
                <p className="mt-2 text-sm text-steel tabular">{item.count} מוצרים</p>
                <p className="mt-1 line-clamp-1 text-sm text-steel">
                  {copy.exampleLabel}: {item.example.title}
                </p>
              </Link>
            </li>
          ))}

          <li className="flex w-[min(84vw,26rem)] shrink-0 snap-start flex-col justify-center rounded-[var(--radius-panel)] bg-ink p-8 text-paper lg:p-10">
            <h3 className="font-display text-display-md">{copy.closingTitle}</h3>
            <p className="mt-4 text-fog">{copy.closingBody}</p>
            <a
              href={whatsappLink("היי, אני מחפש חלק. היצרן, הדגם והשנה:")}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonClass("primary", "lg")} mt-8 self-start`}
            >
              <WhatsappIcon size={20} />
              {copy.closingCta}
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
