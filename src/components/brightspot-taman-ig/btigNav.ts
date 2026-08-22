/**
 * Client-side navigation for Brightspot Taman.
 * Uses History API so page transitions work offline without Next.js RSC fetches.
 */

import {
  BTIG_ASSETS,
  BTIG_ROUTES,
} from "@/app/btig-sw-routes";

export { BTIG_ASSETS, BTIG_ROUTES };

type Listener = (path: string) => void;

const listeners = new Set<Listener>();
let popstateBound = false;

export function normalizeBtigPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  if (trimmed === "/brightspot-taman-ig" || trimmed.startsWith("/brightspot-taman-ig/")) {
    return trimmed;
  }
  return "/brightspot-taman-ig";
}

export function getBtigPath(): string {
  if (typeof window === "undefined") return "/brightspot-taman-ig";
  return normalizeBtigPath(window.location.pathname);
}

function ensurePopstate() {
  if (popstateBound || typeof window === "undefined") return;
  popstateBound = true;
  window.addEventListener("popstate", () => {
    const path = getBtigPath();
    listeners.forEach((l) => l(path));
  });
}

function notify(path: string) {
  listeners.forEach((l) => l(path));
}

export function btigPush(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeBtigPath(href);
  if (normalizeBtigPath(window.location.pathname) === path) return;
  window.history.pushState({ bt: true }, "", path);
  notify(path);
}

export function btigReplace(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeBtigPath(href);
  window.history.replaceState({ bt: true }, "", path);
  notify(path);
}

export function subscribeBtigPath(listener: Listener): () => void {
  ensurePopstate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Warm HTTP cache / SW for hard-reload offline support. */
export function warmBtigRouteCache() {
  if (typeof window === "undefined") return;
  for (const url of [...BTIG_ROUTES, ...BTIG_ASSETS]) {
    void fetch(url, { credentials: "same-origin", cache: "force-cache" }).catch(
      () => {},
    );
  }
}
