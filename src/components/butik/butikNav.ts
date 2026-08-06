/**
 * Client-side navigation for Butik.
 * Uses History API so page transitions work offline without Next.js RSC fetches.
 */

import {
  BUTIK_ASSETS,
  BUTIK_ROUTES,
} from "@/app/butik-sw-routes";

export { BUTIK_ASSETS, BUTIK_ROUTES };

type Listener = (path: string) => void;

const listeners = new Set<Listener>();
let popstateBound = false;

export function normalizeButikPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  if (trimmed === "/butik" || trimmed.startsWith("/butik/")) {
    return trimmed;
  }
  return "/butik";
}

export function getButikPath(): string {
  if (typeof window === "undefined") return "/butik";
  return normalizeButikPath(window.location.pathname);
}

function ensurePopstate() {
  if (popstateBound || typeof window === "undefined") return;
  popstateBound = true;
  window.addEventListener("popstate", () => {
    const path = getButikPath();
    listeners.forEach((l) => l(path));
  });
}

function notify(path: string) {
  listeners.forEach((l) => l(path));
}

export function butikPush(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeButikPath(href);
  if (normalizeButikPath(window.location.pathname) === path) return;
  window.history.pushState({ bt: true }, "", path);
  notify(path);
}

export function butikReplace(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeButikPath(href);
  window.history.replaceState({ bt: true }, "", path);
  notify(path);
}

export function subscribeButikPath(listener: Listener): () => void {
  ensurePopstate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Warm HTTP cache / SW for hard-reload offline support. */
export function warmButikRouteCache() {
  if (typeof window === "undefined") return;
  for (const url of [...BUTIK_ROUTES, ...BUTIK_ASSETS]) {
    void fetch(url, { credentials: "same-origin", cache: "force-cache" }).catch(
      () => {},
    );
  }
}
