import { useSyncExternalStore } from "react";

/** "My bike" is a per-browser convenience, so it lives in localStorage (with safe fallbacks). */
export type MyBike = { makeSlug: string; makeName: string; modelSlug: string; modelName: string; year?: number };

const KEY = "ms:my-bike";
const EVENT = "ms:my-bike-change";

export function readMyBike(): MyBike | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MyBike) : null;
  } catch {
    return null;
  }
}

export function saveMyBike(bike: MyBike | null) {
  try {
    if (bike) localStorage.setItem(KEY, JSON.stringify(bike));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable (private mode) — the picker still works for this page view */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function onMyBikeChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function myBikeHref(b: MyBike) {
  return `/vehicles/${b.makeSlug}/${b.modelSlug}${b.year ? `?year=${b.year}` : ""}`;
}

// ── React binding ──────────────────────────────────────────────────────

let cachedRaw: string | null | undefined;
let cachedBike: MyBike | null = null;

/** Stable snapshot: the same object is returned until the stored value changes. */
function snapshot(): MyBike | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedBike = readMyBike();
  }
  return cachedBike;
}

/** The saved bike, kept in sync across components and tabs. Null during server render. */
export function useMyBike(): MyBike | null {
  return useSyncExternalStore(onMyBikeChange, snapshot, () => null);
}
