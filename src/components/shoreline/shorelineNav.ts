/**
 * Client-side navigation for Shoreline.
 * Uses History API so page transitions work offline without Next.js RSC fetches.
 */

import {
  SHORELINE_ASSETS,
  SHORELINE_ROUTES,
} from "@/app/shoreline-sw-routes";

export { SHORELINE_ASSETS, SHORELINE_ROUTES };

type Listener = (path: string) => void;

const listeners = new Set<Listener>();
let popstateBound = false;

export function normalizeShorelinePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  if (trimmed === "/shoreline" || trimmed.startsWith("/shoreline/")) {
    return trimmed;
  }
  return "/shoreline";
}

export function getShorelinePath(): string {
  if (typeof window === "undefined") return "/shoreline";
  return normalizeShorelinePath(window.location.pathname);
}

function ensurePopstate() {
  if (popstateBound || typeof window === "undefined") return;
  popstateBound = true;
  window.addEventListener("popstate", () => {
    const path = getShorelinePath();
    listeners.forEach((l) => l(path));
  });
}

function notify(path: string) {
  listeners.forEach((l) => l(path));
}

export function shorelinePush(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeShorelinePath(href);
  if (normalizeShorelinePath(window.location.pathname) === path) return;
  window.history.pushState({ bt: true }, "", path);
  notify(path);
}

export function shorelineReplace(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeShorelinePath(href);
  window.history.replaceState({ bt: true }, "", path);
  notify(path);
}

export function subscribeShorelinePath(listener: Listener): () => void {
  ensurePopstate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Warm HTTP cache / SW for hard-reload offline support. */
export function warmShorelineRouteCache() {
  if (typeof window === "undefined") return;
  for (const url of [...SHORELINE_ROUTES, ...SHORELINE_ASSETS]) {
    void fetch(url, { credentials: "same-origin", cache: "force-cache" }).catch(
      () => {},
    );
  }
}
