/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from "serwist";
import { BT_ASSETS, BT_ROUTES } from "./bt-sw-routes";
import { BUTIK_ASSETS, BUTIK_ROUTES } from "./butik-sw-routes";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_APP = "/brightspot-taman";
const OFFLINE_BUTIK = "/butik";
const NAV_CACHE = "bt-navigations";
const BUTIK_NAV_CACHE = "butik-navigations";
const IMG_CACHE = "bt-images";
const NEXT_STATIC_CACHE = "next-static-assets";

/**
 * Full __SW_MANIFEST includes volatile Turbopack chunk URLs. If any 404 during
 * install, the SW never activates → Chrome "You're offline" on reopen.
 * Only precache stable URLs; cache JS/CSS at runtime on first online visit.
 */
const STABLE_PRECACHE: PrecacheEntry[] = [
  ...BT_ROUTES.map((url) => ({ url, revision: "bt-stable-1" })),
  ...BT_ASSETS.map((url) => ({ url, revision: "bt-stable-1" })),
  ...BUTIK_ROUTES.map((url) => ({ url, revision: "butik-stable-1" })),
  ...BUTIK_ASSETS.map((url) => ({ url, revision: "butik-stable-1" })),
  { url: "/offline-boot.html", revision: "bt-stable-1" },
  { url: "/manifest.webmanifest", revision: "bt-stable-1" },
  { url: "/icons/icon-192.png", revision: "bt-stable-1" },
  { url: "/icons/icon-512.png", revision: "bt-stable-1" },
];

function offlineCapableDefaultCache(): RuntimeCaching[] {
  const base: RuntimeCaching[] =
    defaultCache.length === 1
      ? [
          {
            matcher: /\/_next\/static.+/i,
            handler: new CacheFirst({ cacheName: NEXT_STATIC_CACHE }),
          },
          {
            matcher: /\.(?:js|css)$/i,
            handler: new NetworkFirst({
              cacheName: "static-js-css",
              networkTimeoutSeconds: 2,
            }),
          },
          {
            matcher: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
            handler: new CacheFirst({ cacheName: "static-image-assets" }),
          },
          {
            matcher: /.*/i,
            handler: new NetworkFirst({
              cacheName: "others",
              networkTimeoutSeconds: 2,
            }),
          },
        ]
      : defaultCache;

  // NetworkOnly catch-alls turn offline reopen into Chrome's interstitial
  return base.filter((entry) => !(entry.handler instanceof NetworkOnly));
}

async function matchInAllCaches(keys: string[]): Promise<Response | undefined> {
  for (const key of keys) {
    const hit = await caches.match(key, { ignoreSearch: true });
    if (hit) return hit;
  }
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const key of keys) {
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
    }
  }
  return undefined;
}

function navKeysFor(pathname: string): string[] {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  const withSlash = `${trimmed}/`;
  const offlineRoot = trimmed.startsWith("/butik")
    ? OFFLINE_BUTIK
    : OFFLINE_APP;
  return Array.from(
    new Set([
      pathname,
      trimmed,
      withSlash,
      offlineRoot,
      `${offlineRoot}/`,
      new URL(pathname, self.location.origin).href,
      new URL(trimmed, self.location.origin).href,
      new URL(offlineRoot, self.location.origin).href,
    ]),
  );
}

function navCacheFor(pathname: string): string {
  return pathname.startsWith("/butik") ? BUTIK_NAV_CACHE : NAV_CACHE;
}

async function putNav(pathname: string, response: Response) {
  if (!response.ok) return;
  const cache = await caches.open(navCacheFor(pathname));
  const buf = await response.clone().arrayBuffer();
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Type",
    headers.get("Content-Type") || "text/html; charset=utf-8",
  );
  for (const key of navKeysFor(pathname)) {
    await cache.put(
      key,
      new Response(buf.slice(0), { status: 200, statusText: "OK", headers }),
    );
  }
}

async function handleAppNavigation(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const keys = navKeysFor(url.pathname);
  const offlineRoot = url.pathname.startsWith("/butik")
    ? OFFLINE_BUTIK
    : OFFLINE_APP;

  const cached = await matchInAllCaches(keys);
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh.ok) await putNav(url.pathname, fresh.clone());
    return fresh;
  } catch {
    const fallback = await matchInAllCaches([
      offlineRoot,
      `${offlineRoot}/`,
    ]);
    if (fallback) return fallback;

    return new Response(
      `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Photobooth</title><style>html,body{margin:0;min-height:100%;background:#1a0508;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}</style></head><body><div><p>Photobooth belum siap offline.</p><p style="opacity:.7">Buka sekali saat online, lalu coba lagi.</p></div></body></html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }
}

// First respondWith wins — keep BT navigations out of Serwist's NetworkOnly paths
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache Next static assets aggressively as they load
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(NEXT_STATIC_CACHE);
        const hit = await cache.match(request);
        if (hit) return hit;
        try {
          const res = await fetch(request);
          if (res.ok) await cache.put(request, res.clone());
          return res;
        } catch {
          const again = await cache.match(request, { ignoreSearch: true });
          if (again) return again;
          throw new Error("next-static miss");
        }
      })(),
    );
    return;
  }

  const isAppNav =
    (url.pathname.startsWith("/brightspot-taman") ||
      url.pathname.startsWith("/butik")) &&
    (request.mode === "navigate" || request.destination === "document");

  if (isAppNav) {
    event.respondWith(handleAppNavigation(request));
  }
});

const serwist = new Serwist({
  precacheEntries: STABLE_PRECACHE,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  precacheOptions: {
    navigateFallback: OFFLINE_APP,
    navigateFallbackDenylist: [/^\/serwist\//, /^\/_next\//, /^\/api\//],
  },
  runtimeCaching: [
    {
      matcher({ request, url }) {
        return (
          request.method === "GET" &&
          url.pathname.startsWith("/brightspot-taman") &&
          request.mode !== "navigate" &&
          request.destination !== "document"
        );
      },
      handler: new NetworkFirst({
        cacheName: NAV_CACHE,
        networkTimeoutSeconds: 2,
      }),
    },
    {
      matcher({ request, url }) {
        return (
          request.method === "GET" &&
          url.pathname.startsWith("/butik") &&
          request.mode !== "navigate" &&
          request.destination !== "document"
        );
      },
      handler: new NetworkFirst({
        cacheName: BUTIK_NAV_CACHE,
        networkTimeoutSeconds: 2,
      }),
    },
    {
      matcher({ url }) {
        return url.pathname.startsWith("/images/bt/");
      },
      handler: new CacheFirst({
        cacheName: IMG_CACHE,
      }),
    },
    {
      matcher: /\/_next\/static.+/i,
      handler: new CacheFirst({
        cacheName: NEXT_STATIC_CACHE,
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

async function seedCaches() {
  const imgCache = await caches.open(IMG_CACHE);
  await Promise.all(
    [...BT_ROUTES, ...BUTIK_ROUTES].map(async (path) => {
      try {
        const res = await fetch(path, { credentials: "same-origin" });
        if (res.ok) await putNav(path, res);
      } catch {
        // ignore
      }
    }),
  );
  const assetSet = new Set<string>([...BT_ASSETS, ...BUTIK_ASSETS]);
  await Promise.all(
    [...assetSet].map(async (path) => {
      try {
        const res = await fetch(path, { credentials: "same-origin" });
        if (res.ok) await imgCache.put(path, res.clone());
      } catch {
        // ignore
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(seedCaches());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await seedCaches();
    })(),
  );
});

serwist.addEventListeners();
