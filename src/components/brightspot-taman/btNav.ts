/**
 * Client-side navigation for Brightspot Taman.
 * Uses History API so page transitions work offline without Next.js RSC fetches.
 */

import {
  BT_ASSETS,
  BT_ROUTES,
} from "@/app/bt-sw-routes";

export { BT_ASSETS, BT_ROUTES };

type Listener = (path: string) => void;

const listeners = new Set<Listener>();
let popstateBound = false;

export function normalizeBtPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  if (trimmed === "/brightspot-taman" || trimmed.startsWith("/brightspot-taman/")) {
    return trimmed;
  }
  return "/brightspot-taman";
}

export function getBtPath(): string {
  if (typeof window === "undefined") return "/brightspot-taman";
  return normalizeBtPath(window.location.pathname);
}

function ensurePopstate() {
  if (popstateBound || typeof window === "undefined") return;
  popstateBound = true;
  window.addEventListener("popstate", () => {
    const path = getBtPath();
    listeners.forEach((l) => l(path));
  });
}

function notify(path: string) {
  listeners.forEach((l) => l(path));
}

export function btPush(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeBtPath(href);
  if (normalizeBtPath(window.location.pathname) === path) return;
  window.history.pushState({ bt: true }, "", path);
  notify(path);
}

export function btReplace(href: string) {
  if (typeof window === "undefined") return;
  ensurePopstate();
  const path = normalizeBtPath(href);
  window.history.replaceState({ bt: true }, "", path);
  notify(path);
}

export function subscribeBtPath(listener: Listener): () => void {
  ensurePopstate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Warm HTTP cache / SW for hard-reload offline support. */
export function warmBtRouteCache() {
  if (typeof window === "undefined") return;
  for (const url of [...BT_ROUTES, ...BT_ASSETS]) {
    void fetch(url, { credentials: "same-origin", cache: "force-cache" }).catch(
      () => {},
    );
  }
}
