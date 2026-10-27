"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import type { HelmetScene } from "./scene";

type Props = {
  kicker: string;
  title: string;
  body: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  illustrationNote: string;
};

/**
 * Home hero with the 3D helmet. The text is server-rendered and painted first (it is the
 * page's LCP); three.js loads afterwards, when the browser is idle, and fades the helmet in.
 * Scrolling through the section turns the helmet and opens its visor; the stage is pinned
 * with CSS `position: sticky` (no scroll-jacking). Reduced motion: a still helmet.
 * No WebGL or a software renderer: the hero is text only (nothing is lost but the picture).
 */
/**
 * WebGL with a real GPU. Software renderers (SwiftShader, llvmpipe) draw every frame on the
 * CPU and would make the page janky, so there the hero stays text-only.
 * `?3d=force` overrides this (for testing in headless browsers).
 */
function hasHardwareWebGL() {
  const probe = document.createElement("canvas");
  const gl = (probe.getContext("webgl2") ?? probe.getContext("webgl")) as WebGLRenderingContext | null;
  if (!gl) return false;
  if (new URLSearchParams(window.location.search).get("3d") === "force") return true;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return !/swiftshader|llvmpipe|softpipe|software/i.test(renderer);
}

export function HelmetHero({ kicker, title, body, primaryCta, secondaryCta, illustrationNote }: Props) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = section.current;
    const c = canvas.current;
    if (!el || !c) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = window.matchMedia("(max-width: 767px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    let scene: HelmetScene | null = null;
    let disposed = false;
    const cleanups: (() => void)[] = [];

    const start = async () => {
      // WebGL unavailable (old device, blocked): the hero simply stays text-only.
      if (!hasHardwareWebGL()) return;
      const { createHelmetScene } = await import("./scene");
      if (disposed) return;
      scene = createHelmetScene(c, { reducedMotion, lowPower });
      setReady(true);

      const onScroll = () => {
        const r = el.getBoundingClientRect();
        const travel = Math.max(1, r.height - window.innerHeight);
        scene?.setProgress(-r.top / travel);
      };
      const onResize = () => scene?.resize();
      const onPointer = (e: PointerEvent) => scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onResize);
      if (!lowPower) window.addEventListener("pointermove", onPointer, { passive: true });
      onScroll();
      // Stop rendering while the hero is off screen.
      const io = new IntersectionObserver(([entry]) => (entry?.isIntersecting ? scene?.resume() : scene?.pause()));
      io.observe(el);
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointer);
        io.disconnect();
      });
    };

    // Wait until the page has painted and the main thread is free.
    const idle = (cb: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 2500 }) : globalThis.setTimeout(cb, 1200));
    const kick = () => idle(() => void start());
    if (document.readyState === "complete") kick();
    else window.addEventListener("load", kick, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener("load", kick);
      cleanups.forEach((f) => f());
      scene?.dispose();
    };
  }, []);

  return (
    <section ref={section} aria-labelledby="home-hero-title" className="relative bg-ink text-paper motion-safe:h-[150svh] lg:motion-safe:h-[190svh]">
      <div className="sticky top-[var(--header-h,6rem)] isolate overflow-hidden">
        {/* One key light from above-left; the helmet sits in it. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_60%_at_28%_42%,#2a2c30_0%,#0d0d0e_55%,#000_100%)]" />
        <div className="mx-auto grid min-h-[calc(100svh-6rem)] max-w-[1400px] items-center gap-4 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-10">
          <div className="relative z-10 order-2 lg:order-1">
            <p className="text-sm text-fog">{kicker}</p>
            <h1 id="home-hero-title" className="mt-3 font-display text-display-xl motion-safe:animate-[hero-settle_1100ms_var(--ease-out-quart)_both]">
              {title}
            </h1>
            <p className="mt-6 max-w-[38ch] text-lg leading-relaxed text-fog">{body}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={primaryCta.href} className={buttonClass("primary", "lg")}>
                {primaryCta.label}
              </Link>
              <Link href={secondaryCta.href} className={buttonClass("outline", "lg", "border-line-dark text-paper hover:border-paper hover:bg-paper hover:text-ink")}>
                {secondaryCta.label}
              </Link>
            </div>
          </div>
          <figure className="relative order-1 m-0 lg:order-2">
            {/* Still frame of the same 3D helmet: shown until (or instead of) the live one. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- static decorative poster, sized by CSS */}
            <img
              src="/images/hero-helmet.webp"
              alt=""
              aria-hidden="true"
              width={1260}
              height={1260}
              decoding="async"
              fetchPriority="low"
              className={`pointer-events-none absolute inset-x-0 top-0 mx-auto aspect-square w-full max-h-[46svh] max-w-[46svh] object-contain transition-opacity duration-1000 lg:max-h-[78svh] lg:max-w-[78svh] ${ready ? "opacity-0" : "opacity-100"}`}
            />
            <canvas
              ref={canvas}
              aria-hidden="true"
              className={`mx-auto block aspect-square w-full max-h-[46svh] max-w-[46svh] transition-opacity duration-1000 lg:max-h-[78svh] lg:max-w-[78svh] ${ready ? "opacity-100" : "opacity-0"}`}
            />
            <figcaption className="absolute bottom-1 start-0 text-xs text-steel">{illustrationNote}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
