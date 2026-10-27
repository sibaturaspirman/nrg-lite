/**
 * Client-side navigation for Bengkel.
 * Uses History API so page transitions work offline without Next.js RSC fetches.
 */

import {
  BENGKEL_ASSETS,
  BENGKEL_ROUTES,
} from "@/app/bengkel-sw-routes";

export { BENGKEL_ASSETS, BENGKEL_ROUTES };

type Listener = (path: string) => void;

const listeners = new Set<Listener>();
let popstateBound = false;

export function normalizeBengkelPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  if (trimmed === "/bengkel" || trimmed.startsWith("/bengkel/")) {
    return trimmed;
  }
  return "/bengkel";
}

export function getBengkelPath(): string {
  if (typeof window === "undefined") return "/bengkel";
  return normalizeBengkelPath(window.location.pathname);
}

function ensurePopstate() {
  if (popstateBound || typeof window === "undefined") return;
  popstateBound = true;
  window.addEventListener("popstate", () => {
    const path = getBengkelPath();
    listeners.forEach((l) => l(path));
  });
}

function notify(path: string) {
  listeners.forEach((l) => l(path));
}

export function bengkelPush(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeBengkelPath(href);
  if (normalizeBengkelPath(window.location.pathname) === path) return;
  window.history.pushState({ bt: true }, "", path);
  notify(path);
}

export function bengkelReplace(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeBengkelPath(href);
  window.history.replaceState({ bt: true }, "", path);
  notify(path);
}

export function subscribeBengkelPath(listener: Listener): () => void {
  ensurePopstate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Warm HTTP cache / SW for hard-reload offline support. */
export function warmBengkelRouteCache() {
  if (typeof window === "undefined") return;
  for (const url of [...BENGKEL_ROUTES, ...BENGKEL_ASSETS]) {
    void fetch(url, { credentials: "same-origin", cache: "force-cache" }).catch(
      () => {},
    );
  }
}
