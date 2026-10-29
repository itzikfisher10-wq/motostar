import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/icons";
import { HelmetStage } from "./HelmetStage";
import { RotatingPhrase } from "./RotatingPhrase";

export type TrustItem = { icon: ReactNode; title: string; note: string };

type Props = {
  badge: string;
  title: string;
  phrases: readonly string[];
  body: string;
  primaryCta: { label: string; href: string };
  dealsCta: { label: string; href: string } | null;
  araiCta: { label: string; href: string };
  whatsapp: { label: string; href: string };
  trust: TrustItem[];
  illustrationNote: string;
};

/**
 * Home hero.
 * - The text is server-rendered and painted first (it is the page's LCP); three.js loads when the
 *   browser is idle and fades the 3D helmet in. Scrolling turns the helmet and opens its visor.
 * - Desktop: the stage is pinned (CSS sticky). As the next section slides up over it like a sheet,
 *   the stage recedes: it scales back, rounds its corners and dims (motion.css → "Home hero").
 *   A scroll listener only writes one number, --p (0..1), on the section; CSS does the rest.
 * - Glass trust cards float over the stage. Every line on them is a fact from src/config/site.ts.
 * - Reduced motion / no JS: nothing pins, nothing moves, everything is shown.
 * - No WebGL, or a software renderer: the still frame of the helmet stays.
 */
export function HelmetHero({ badge, title, phrases, body, primaryCta, dealsCta, araiCta, whatsapp, trust, illustrationNote }: Props) {
  return (
    <section data-home-hero aria-labelledby="home-hero-title" className="relative -mt-[var(--header-h)] bg-ink text-paper">
      <div data-home-hero-stage className="relative isolate overflow-hidden bg-ink">
        {/* Light: one key light from above the helmet, a low red glow from the floor. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_30%_40%,#26282c_0%,#0d0d0e_58%,#050505_100%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 start-1/4 -z-10 h-[28rem] w-[60rem] max-w-full rounded-full bg-[radial-gradient(closest-side,rgb(225_18_26/0.2),rgb(225_18_26/0.06)_55%,transparent)]" />

        <div className="mx-auto grid h-full max-w-[1400px] items-center gap-6 px-4 pb-8 pt-[calc(var(--header-h)+1rem)] sm:px-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-4 lg:px-10 lg:pb-40 lg:pt-[calc(var(--header-h)+2rem)]">
          <div data-home-hero-copy className="relative z-10 order-2 text-center lg:order-1 lg:text-start">
            <p className="glass-dark inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.8rem] font-bold">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
              {badge}
            </p>
            <h1 id="home-hero-title" className="mt-5 text-[clamp(2.5rem,1.6rem+4vw,4.75rem)] font-black leading-[1.02] tracking-[-0.025em]">
              <span className="block">{title}</span>
              <RotatingPhrase phrases={phrases} />
            </h1>
            <p className="mx-auto mt-5 max-w-[46ch] text-base leading-relaxed text-white/75 sm:text-lg lg:mx-0">{body}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-2.5 lg:justify-start">
              <Link href={primaryCta.href} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
                {primaryCta.label}
              </Link>
              <a href={whatsapp.href} target="_blank" rel="noopener noreferrer" className={buttonClass("glass", "lg")}>
                <WhatsappIcon size={20} />
                {whatsapp.label}
              </a>
              {/* Phones keep two buttons; the rest are one tap away in the menu. */}
              <span className="hidden sm:contents">
                {dealsCta && (
                  <Link href={dealsCta.href} className={buttonClass("glass", "lg")}>
                    {dealsCta.label}
                  </Link>
                )}
              </span>
              <span className="hidden xl:contents">
                <Link href={araiCta.href} className={buttonClass("glass", "lg")}>
                  {araiCta.label}
                </Link>
              </span>
            </div>
          </div>

          <HelmetStage note={illustrationNote} />
        </div>

        {/* Facts, on glass. Phones and tablets: two by two under the buttons. */}
        <ul data-home-hero-trust className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-2 gap-2 px-4 pb-10 sm:px-6 md:grid-cols-4 lg:absolute lg:inset-x-0 lg:bottom-14 lg:gap-3 lg:px-10 lg:pb-0">
          {trust.map((t) => (
            <li key={t.title} className="glass-dark flex items-center gap-2.5 rounded-2xl px-3 py-3 text-start sm:gap-3 sm:px-3.5">
              <span aria-hidden="true" className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-signal-bright sm:grid">
                {t.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.82rem] font-black leading-tight sm:text-sm">{t.title}</span>
                <span className="mt-0.5 block text-[0.74rem] leading-tight text-white/65 sm:text-[0.78rem]">{t.note}</span>
              </span>
            </li>
          ))}
        </ul>
        {/* Dims the stage as the next section covers it (desktop, motion only). */}
        <div data-home-hero-dim aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-black opacity-0" />
      </div>
    </section>
  );
}
