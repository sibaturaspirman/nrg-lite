/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, Serwist } from "serwist";
import { BT_ASSETS, BT_ROUTES } from "./bt-sw-routes";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Offline entry — full photobooth app, never Chrome's "You're offline". */
const OFFLINE_APP = "/brightspot-taman";

/**
 * In `next dev`, @serwist/turbopack sets defaultCache to a single NetworkOnly
 * rule. That makes every cold start fail offline → browser interstitial
 * "You're offline". Use production-like strategies instead.
 */
function offlineCapableDefaultCache(): RuntimeCaching[] {
  // Dev build of defaultCache is `[{ matcher: /.*/, handler: NetworkOnly }]`
  if (defaultCache.length === 1) {
    return [
      {
        matcher: /\/_next\/static.+\.js$/i,
        handler: new CacheFirst({ cacheName: "next-static-js-assets" }),
      },
      {
        matcher: /\/_next\/static.+\.css$/i,
        handler: new CacheFirst({ cacheName: "next-static-css-assets" }),
      },
      {
        matcher: /\.(?:js)$/i,
        handler: new NetworkFirst({
          cacheName: "static-js-assets",
          networkTimeoutSeconds: 2,
        }),
      },
      {
        matcher: /\.(?:css)$/i,
        handler: new NetworkFirst({
          cacheName: "static-style-assets",
          networkTimeoutSeconds: 2,
        }),
      },
      {
        matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: new CacheFirst({ cacheName: "static-image-assets" }),
      },
      {
        matcher: ({ request, sameOrigin }) =>
          sameOrigin &&
          (request.mode === "navigate" || request.destination === "document"),
        handler: new NetworkFirst({
          cacheName: "pages",
          networkTimeoutSeconds: 2,
        }),
      },
      {
        matcher: /.*/i,
        handler: new NetworkFirst({
          cacheName: "others",
          networkTimeoutSeconds: 2,
        }),
      },
    ];
  }
  return defaultCache;
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Preload often fails offline and can block a cached response
  navigationPreload: false,
  precacheOptions: {
    navigateFallback: OFFLINE_APP,
    navigateFallbackDenylist: [/^\/serwist\//, /^\/_next\//, /^\/api\//],
  },
  runtimeCaching: [
    // Cache-first so reopen-while-offline always hits disk cache
    {
      matcher({ request, url }) {
        return (
          (request.mode === "navigate" || request.destination === "document") &&
          url.pathname.startsWith("/brightspot-taman")
        );
      },
      handler: new CacheFirst({
        cacheName: "bt-navigations",
      }),
    },
    {
      matcher({ url }) {
        return url.pathname.startsWith("/images/bt/");
      },
      handler: new CacheFirst({
        cacheName: "bt-images",
      }),
    },
    ...offlineCapableDefaultCache(),
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_APP,
        matcher({ request }) {
          return (
            request.mode === "navigate" || request.destination === "document"
          );
        },
      },
    ],
  },
});

/** Seed runtime caches during install so cold start offline works. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const navCache = await caches.open("bt-navigations");
      const imgCache = await caches.open("bt-images");

      await Promise.all(
        BT_ROUTES.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: "same-origin" });
            if (res.ok) await navCache.put(url, res.clone());
          } catch {
            // ignore — may already be offline during update
          }
        }),
      );

      await Promise.all(
        BT_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: "same-origin" });
            if (res.ok) await imgCache.put(url, res.clone());
          } catch {
            // ignore
          }
        }),
      );
    })(),
  );
});

serwist.addEventListeners();
