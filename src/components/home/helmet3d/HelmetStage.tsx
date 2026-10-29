"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { HelmetScene } from "./scene";

/**
 * The hero's picture and its motion (client island inside the server-rendered HelmetHero):
 * - the still frame of the helmet is painted first (LCP); three.js loads when the browser is idle
 *   and fades the live helmet in. Scrolling turns it and opens the visor.
 * - one scroll listener writes the scroll progress through the hero as --p (0..1) on the
 *   [data-home-hero] section, once per frame. CSS does the stage effects (motion.css → "Home hero").
 * - No WebGL, or a software renderer: the still frame stays. Reduced motion: nothing moves.
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

export function HelmetStage({ note }: { note: string }) {
  const figure = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = figure.current?.closest<HTMLElement>("[data-home-hero]");
    const c = canvas.current;
    if (!el || !c) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower = window.matchMedia("(max-width: 767px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    let scene: HelmetScene | null = null;
    let disposed = false;
    let frame = 0;
    const cleanups: (() => void)[] = [];

    // Scroll progress through the hero, written once per frame as --p for the CSS stage effects.
    const progress = () => {
      const r = el.getBoundingClientRect();
      const travel = Math.max(window.innerHeight * 0.6, r.height - window.innerHeight);
      return Math.min(1, Math.max(0, -r.top / travel));
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const p = progress();
        el.style.setProperty("--p", p.toFixed(4));
        scene?.setProgress(p);
      });
    };
    if (!reducedMotion) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      onScroll();
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        cancelAnimationFrame(frame);
      });
    }

    const start = async () => {
      if (!hasHardwareWebGL()) return;
      const { createHelmetScene } = await import("./scene");
      if (disposed) return;
      scene = createHelmetScene(c, { reducedMotion, lowPower });
      setReady(true);
      scene.setProgress(progress());
      const onResize = () => scene?.resize();
      const onPointer = (e: PointerEvent) => scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      window.addEventListener("resize", onResize);
      if (!lowPower) window.addEventListener("pointermove", onPointer, { passive: true });
      // Stop rendering while the hero is off screen.
      const io = new IntersectionObserver(([entry]) => (entry?.isIntersecting ? scene?.resume() : scene?.pause()));
      io.observe(el);
      cleanups.push(() => {
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
    <figure ref={figure} className="relative order-1 m-0 lg:order-2">
      {/* Still frame of the same 3D helmet: shown until (or instead of) the live one. */}
      <Image
        src="/images/hero-helmet.webp"
        alt=""
        aria-hidden="true"
        width={1260}
        height={1260}
        priority
        sizes="(min-width: 1024px) 64svh, 36svh"
        className={`pointer-events-none absolute inset-x-0 top-0 mx-auto aspect-square w-full max-h-[36svh] max-w-[36svh] object-contain transition-opacity duration-1000 lg:max-h-[64svh] lg:max-w-[64svh] ${ready ? "opacity-0" : "opacity-100"}`}
      />
      <canvas
        ref={canvas}
        aria-hidden="true"
        className={`mx-auto block aspect-square w-full max-h-[36svh] max-w-[36svh] transition-opacity duration-1000 lg:max-h-[64svh] lg:max-w-[64svh] ${ready ? "opacity-100" : "opacity-0"}`}
      />
      <figcaption className="mt-1 text-center text-[0.7rem] text-white/45 lg:absolute lg:bottom-0 lg:end-0 lg:mt-0">{note}</figcaption>
    </figure>
  );
}
