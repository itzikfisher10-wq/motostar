"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

/**
 * Open/closed state for menus and overlays that must close when the route changes.
 * "Open" is remembered together with the path it was opened on, so navigating away
 * closes it without an extra effect/render.
 */
export function useRouteScopedOpen(): [boolean, (open: boolean) => void] {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  const setOpen = useCallback((open: boolean) => setOpenOn(open ? pathname : null), [pathname]);
  return [openOn === pathname, setOpen];
}
