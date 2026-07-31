/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Offline entry — full photobooth app, not the "you're offline" page. */
const OFFLINE_APP = "/brightspot-taman";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  precacheOptions: {
    // SPA-style: unknown/uncached navigations serve the BT app shell
    navigateFallback: OFFLINE_APP,
    navigateFallbackDenylist: [/^\/serwist\//, /^\/_next\/webpack-hmr/],
  },
  runtimeCaching: [
    // Prefer cache quickly for BT pages when offline
    {
      matcher({ request, url }) {
        return (
          request.mode === "navigate" &&
          url.pathname.startsWith("/brightspot-taman")
        );
      },
      handler: new NetworkFirst({
        cacheName: "bt-navigations",
        networkTimeoutSeconds: 2,
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        // Never show /~offline for document misses — open the app instead
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

serwist.addEventListeners();
