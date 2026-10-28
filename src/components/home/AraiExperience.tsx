"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AraiShowcase } from "@/features/content/arai-showcase";
import { formatPrice } from "@/lib/format/money";
import { buttonClass } from "@/components/ui/Button";
import { reveal } from "@/components/motion/reveal";
import { headerHeight, scenePriority, whenNear } from "@/components/motion/useScrollScene";

/**
 * The Arai flagship sequence (home page).
 *
 *  Animation 01  Entrance   – the visor rises out of the dark; a highlight sweeps across it.
 *  Animation 02  Scroll     – the visor lifts away like a visor opening (or, when a licensed
 *                             turntable is configured, the helmet rotates with the scroll).
 *  Animation 03  Details    – pinned tour: visor → vents → mechanism → pads, each with the
 *                             real spare parts, prices and links.
 *  Animation 04  Transition – the tour hands off to the rail of all Arai parts.
 *
 * Everything is rendered as real HTML first; GSAP only enhances it. On phones and with
 * prefers-reduced-motion the tour is a simple vertical sequence (no pinning).
 * Edit copy/products in src/content/arai.ts. Timing constants are below.
 */

const TOUR_SCROLL_PER_STOP = 0.9; // viewport heights of scroll per tour stop (desktop)
const HERO_LIFT = 0.55; // how far the visor travels up as the hero scrolls away (fraction of its height)

export function AraiExperience({ data }: { data: AraiShowcase }) {
  return (
    <div className="relative bg-ink text-paper">
      <AraiHero data={data} />
      {data.stops.length > 0 && <DetailTour stops={data.stops} />}
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────

function AraiHero({ data }: { data: AraiShowcase }) {
  const root = useRef<HTMLElement>(null);
  const { hero } = data;
  const img = hero.product?.image ?? null;

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    const cancelNear = whenNear(el, () => void (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const visor = el.querySelector("[data-visor]");
        const copy = el.querySelector("[data-hero-copy]");
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6, refreshPriority: scenePriority(el) } });
        tl.to(visor, { yPercent: -HERO_LIFT * 100, rotateX: 18, scale: 0.92, ease: "none" }, 0).to(copy, { yPercent: -25, opacity: 0, ease: "none" }, 0);
      }, el);
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    })());
    return () => {
      cancelNear();
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  // Same-origin optimized URL, so the highlight can be masked to the visor's own shape.
  const maskUrl = img ? getImageProps({ src: img.url, alt: "", width: 1200, height: 1200, quality: 80 }).props.src : null;

  return (
    <section ref={root} aria-labelledby="arai-hero-title" className="relative isolate overflow-hidden">
      {/* Directional light: one soft key light from above-left, no glow effects. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_55%_at_30%_35%,#2a2c30_0%,#0d0d0e_55%,#000_100%)]" />
      <div className="mx-auto grid min-h-[calc(100svh-6rem)] max-w-[1400px] items-center gap-6 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-10 lg:pb-10">
        <div data-hero-copy className="relative z-10 order-2 lg:order-1">
          <h2 id="arai-hero-title" className="font-display text-display-lg">
            {hero.title}
          </h2>
          <p className="mt-6 max-w-[34ch] text-lg leading-relaxed text-fog motion-safe:animate-[hero-rise_1100ms_var(--ease-out-quart)_450ms_both]">{hero.body}</p>
          <div className="mt-9 flex flex-wrap items-center gap-3 motion-safe:animate-[hero-rise_1100ms_var(--ease-out-quart)_600ms_both]">
            <Link href={hero.primaryCta.href} className={buttonClass("light", "lg")}>
              {hero.primaryCta.label}
            </Link>
            {hero.product && (
              <Link href={`/products/${hero.product.slug}`} className="text-sm text-fog underline-offset-4 hover:text-paper hover:underline">
                בתמונה: {hero.product.title}, {formatPrice(hero.product.priceFrom)}
              </Link>
            )}
          </div>
        </div>

        <div className="relative order-1 lg:order-2 [perspective:1400px]">
          {/* Outer element is moved by GSAP on scroll; inner element runs the CSS entrance. */}
          <div data-visor className="relative mx-auto aspect-square w-[min(92vw,720px)] origin-bottom [transform-style:preserve-3d]">
          <div className="absolute inset-0 motion-safe:animate-[visor-in_1600ms_var(--ease-out-quart)_both]">
            {hero.media.type === "product" && img && (
              <>
                <Image src={img.url} alt={img.alt} fill priority sizes="(min-width: 1024px) 720px, 92vw" className="object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.65)]" />
                {maskUrl && (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 motion-safe:animate-[visor-sheen_2600ms_ease-in-out_900ms_both]"
                    style={{
                      WebkitMaskImage: `url("${maskUrl}")`,
                      maskImage: `url("${maskUrl}")`,
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                      backgroundImage: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.42) 48%, rgba(255,255,255,0.08) 54%, transparent 62%)",
                      backgroundSize: "250% 100%",
                    }}
                  />
                )}
              </>
            )}
            {hero.media.type === "image" && <Image src={hero.media.src} alt={hero.media.alt} fill priority sizes="(min-width: 1024px) 720px, 92vw" className="object-contain" />}
            {hero.media.type === "video" && (
              <video className="absolute inset-0 h-full w-full object-contain" src={hero.media.src} poster={hero.media.poster} muted playsInline autoPlay loop aria-label={hero.media.alt} />
            )}
            {hero.media.type === "sequence" && <TurntableCanvas media={hero.media} />}
          </div>
          </div>
          {/* Floor reflection line that anchors the floating part. */}
          <div aria-hidden="true" className="mx-auto -mt-6 h-px w-[60%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)]" />
        </div>
      </div>
    </section>
  );
}

/** Scroll-scrubbed 360° turntable for licensed frame sequences (Animation 02). */
function TurntableCanvas({ media }: { media: Extract<AraiShowcase["hero"]["media"], { type: "sequence" }> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx2d = c.getContext("2d");
    const frames: HTMLImageElement[] = [];
    const src = (i: number) => media.pathPattern.replace("{frame}", String(i + 1).padStart(4, "0"));
    for (let i = 0; i < media.frameCount; i++) {
      const im = new window.Image();
      im.decoding = "async";
      im.src = src(i);
      frames.push(im);
    }
    const draw = (i: number) => {
      const im = frames[i];
      if (im?.complete && ctx2d) {
        ctx2d.clearRect(0, 0, c.width, c.height);
        ctx2d.drawImage(im, 0, 0, c.width, c.height);
      }
    };
    frames[0]!.onload = () => draw(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onScroll = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 1.2)));
      draw(Math.round(p * (media.frameCount - 1)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [media]);
  return <canvas ref={canvas} width={media.width} height={media.height} role="img" aria-label={media.alt} className="absolute inset-0 h-full w-full object-contain" />;
}

// ── Detail tour ─────────────────────────────────────────────────────────

function DetailTour({ stops }: { stops: AraiShowcase["stops"] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [enhanced, setEnhanced] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mq = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    const setup = async () => {
      ctx?.revert();
      ctx = undefined;
      if (!mq.matches) {
        setEnhanced(false);
        return;
      }
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      setEnhanced(true);
      // Wait one frame so layout is settled before ScrollTrigger measures the pinned stage.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled) return;
      ctx = gsap.context(() => {
        const images = gsap.utils.toArray<HTMLElement>("[data-stage-image]", el);
        const n = stops.length;
        gsap.set(images, { opacity: 0, scale: 0.86, yPercent: 6 });
        gsap.set(images[0]!, { opacity: 1, scale: 1, yPercent: 0 });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            // Pin below the sticky site header.
            start: () => `top ${headerHeight()}px`,
            end: () => `+=${window.innerHeight * TOUR_SCROLL_PER_STOP * n}`,
            pin: "[data-tour-pin]",
            scrub: 0.5,
            refreshPriority: scenePriority(el),
            snap: { snapTo: 1 / (n - 1 || 1), inertia: false, duration: { min: 0.2, max: 0.6 }, ease: "power2.out", delay: 0.1 },
            onUpdate: (self) => setActive(Math.min(n - 1, Math.round(self.progress * (n - 1)))),
          },
        });
        for (let i = 1; i < n; i++) {
          tl.to(images[i - 1]!, { opacity: 0, scale: 1.12, yPercent: -8, ease: "power2.in", duration: 0.5 }, i - 1 + 0.25)
            .to(images[i]!, { opacity: 1, scale: 1, yPercent: 0, ease: "power2.out", duration: 0.5 }, i - 1 + 0.5);
        }
      }, el);
      ScrollTrigger.sort();
      ScrollTrigger.refresh();
    };

    // Built when the section comes near, so GSAP stays out of the page load.
    const cancelNear = whenNear(el, () => {
      void setup();
      mq.addEventListener("change", setup);
    });
    return () => {
      cancelled = true;
      cancelNear();
      mq.removeEventListener("change", setup);
      ctx?.revert();
    };
  }, [stops.length]);

  const jumpTo = (i: number) => {
    const el = root.current;
    if (!el) return;
    if (!enhanced) {
      document.getElementById(`arai-stop-${stops[i]!.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight() + window.innerHeight * TOUR_SCROLL_PER_STOP * i * (1 / Math.max(1, stops.length - 1)) * stops.length;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <section ref={root} aria-labelledby="arai-tour-title" className="relative">
      <h2 id="arai-tour-title" className="sr-only">
        מה אפשר להחליף בקסדת Arai
      </h2>

      {/* Desktop: pinned stage. Rendered for everyone; enhanced by GSAP on large screens. */}
      <div data-tour-pin className="relative hidden h-[calc(100svh-var(--header-h,6rem))] overflow-hidden lg:motion-safe:block">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_32%_50%,#26282c_0%,#0b0b0c_60%,#000_100%)]" />
        <div className="relative mx-auto grid h-full max-w-[1400px] grid-cols-[minmax(0,6fr)_minmax(0,5fr)] items-center gap-12 px-10">
          <div className="relative order-2 aspect-square w-full max-w-[640px] justify-self-center">
            {stops.map((s, i) => (
              <div key={s.key} data-stage-image className="absolute inset-0" style={{ opacity: i === 0 ? 1 : 0 }}>
                <Image src={s.products[0]!.image!.url} alt={s.products[0]!.image!.alt} fill sizes="640px" className="object-contain drop-shadow-[0_36px_50px_rgba(0,0,0,0.7)]" />
              </div>
            ))}
          </div>
          <div className="order-1">
            <ol className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="חלקי הקסדה">
              {stops.map((s, i) => (
                <li key={s.key}>
                  <button type="button" onClick={() => jumpTo(i)} aria-current={active === i ? "step" : undefined} className={`border-b pb-1 transition-colors ${active === i ? "border-signal text-paper" : "border-transparent text-steel hover:text-fog"}`}>
                    {s.label}
                  </button>
                </li>
              ))}
            </ol>
            <div className="relative mt-10 min-h-[22rem]">
              {stops.map((s, i) => (
                <div key={s.key} className={`absolute inset-0 transition-[opacity,translate] ease-[var(--ease-out-quart)] ${active === i ? "translate-y-0 opacity-100 delay-150 duration-[450ms]" : "pointer-events-none -translate-y-2 opacity-0 delay-0 duration-150"}`} aria-hidden={active !== i}>
                  <StopBody stop={s} tabbable={active === i} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phones / reduced motion / before JS: a calm vertical sequence with the same content. */}
      <div className="lg:motion-safe:hidden">
        {stops.map((s, i) => (
          <article id={`arai-stop-${s.key}`} key={s.key} className="relative border-t border-line-dark">
            <div className={`mx-auto grid max-w-[1400px] items-center gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-10 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div {...reveal.panel} className="relative mx-auto aspect-square w-full max-w-[460px] bg-[radial-gradient(closest-side,#2a2c30,transparent)]">
                <Image src={s.products[0]!.image!.url} alt={s.products[0]!.image!.alt} fill sizes="(min-width: 768px) 460px, 90vw" className="object-contain p-4" />
              </div>
              <div {...reveal.focus}>
                <p className="text-sm text-fog">{s.label}</p>
                <StopBody stop={s} tabbable />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}


function StopBody({ stop, tabbable }: { stop: AraiShowcase["stops"][number]; tabbable: boolean }) {
  return (
    <>
      <h3 className="font-display text-display-lg">{stop.title}</h3>
      <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-fog">{stop.body}</p>
      <ul className="mt-8 divide-y divide-line-dark border-y border-line-dark">
        {stop.products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.slug}`} tabIndex={tabbable ? undefined : -1} className="group flex items-center justify-between gap-4 py-3.5 text-[0.95rem]">
              <span className="group-hover:underline underline-offset-4">{p.title}</span>
              <span className="shrink-0 tabular text-fog">
                {p.isAvailable ? (
                  <>
                    {p.priceFrom !== p.priceTo && <span className="text-xs">החל מ- </span>}
                    {formatPrice(p.priceFrom)}
                  </>
                ) : (
                  "אזל"
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
