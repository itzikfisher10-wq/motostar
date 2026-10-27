"use client";

import { useEffect } from "react";

/**
 * Drives the entrance reveals in src/styles/motion.css in every browser.
 *
 * Each [data-reveal] element (and each card of a [data-reveal="grid"]) gets `data-revealed`
 * when it enters the screen; CSS transitions it from the hidden pose to its final state.
 * - Without JS, or before this runs, nothing is hidden: `motion-ready` on <html> arms the
 *   hidden pose, and it is only added after everything already on screen is marked revealed,
 *   so the first paint never flickers and the LCP element is never hidden.
 * - Reduced motion: does nothing, the page stays as rendered.
 * - Client-side navigation: new elements are picked up by a MutationObserver.
 * Mounted once in the store layout.
 */
const TARGETS = '[data-reveal]:not([data-reveal="grid"]):not([data-reveal="close"]), [data-reveal="grid"] > *';

export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;

    const reveal = (el: Element) => el.setAttribute("data-revealed", "");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          reveal(e.target);
          io.unobserve(e.target);
        }
      },
      // Fire a little after the element's top edge crosses into view, so the motion is seen.
      { rootMargin: "0px 0px -12% 0px", threshold: 0 },
    );

    const onScreen = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };

    const track = (scope: ParentNode, animateVisible: boolean) => {
      scope.querySelectorAll(TARGETS).forEach((el) => {
        if (el.hasAttribute("data-revealed")) return;
        if (onScreen(el)) {
          // First paint: show immediately. After a client navigation: let it animate in.
          if (animateVisible) requestAnimationFrame(() => requestAnimationFrame(() => reveal(el)));
          else reveal(el);
        } else {
          io.observe(el);
        }
      });
    };

    track(document, false);
    root.classList.add("motion-ready");

    // At the very bottom of a short page, an element may never cross the trigger line: show the rest.
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 4) return;
        document.querySelectorAll(TARGETS).forEach((el) => {
          if (!el.hasAttribute("data-revealed")) {
            reveal(el);
            io.unobserve(el);
          }
        });
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        rec.addedNodes.forEach((n) => {
          if (n instanceof Element) track(n.parentElement ?? n, true);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      root.classList.remove("motion-ready");
    };
  }, []);

  return null;
}
