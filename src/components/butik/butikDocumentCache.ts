import { BUTIK_ROUTES } from "@/app/butik-sw-routes";

const NAV_CACHE = "butik-navigations";

/**
 * Persist BT HTML documents into Cache Storage from the page itself.
 * Relies on the browser Cache API (works even if SW routing is flaky),
 * so reopen-while-offline can serve a real document.
 */
export async function persistButikDocuments(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  if (!navigator.onLine) return;

  try {
    const cache = await caches.open(NAV_CACHE);
    await Promise.all(
      BUTIK_ROUTES.map(async (path) => {
        try {
          const res = await fetch(path, {
            credentials: "same-origin",
            cache: "reload",
          });
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          const headers = new Headers({
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "max-age=31536000",
          });
          const keys = [
            path,
            path.endsWith("/") ? path.slice(0, -1) : `${path}/`,
            new URL(path, window.location.origin).href,
          ];
          await Promise.all(
            keys.map((key) =>
              cache.put(
                key,
                new Response(buf.slice(0), { status: 200, headers }),
              ),
            ),
          );
        } catch {
          // ignore individual path failures
        }
      }),
    );
  } catch {
    // ignore
  }
}
