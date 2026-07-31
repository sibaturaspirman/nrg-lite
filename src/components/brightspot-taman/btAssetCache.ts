import { BT_ASSETS } from "@/components/brightspot-taman/btNav";

/** path → blob: URL kept for the whole SPA session (survives route changes offline). */
const blobUrls = new Map<string, string>();
const listeners = new Set<() => void>();
let warming: Promise<void> | null = null;

function notify() {
  listeners.forEach((l) => l());
}

export function subscribeBtAssets(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Resolved src for <img> — prefers in-memory blob so remounts work offline. */
export function resolveBtAsset(src: string): string {
  if (src.startsWith("data:") || src.startsWith("blob:")) return src;
  return blobUrls.get(src) ?? src;
}

export function warmBtAssets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (warming) return warming;

  warming = (async () => {
    await Promise.all(
      BT_ASSETS.map(async (path) => {
        if (blobUrls.has(path)) return;
        try {
          const res = await fetch(path, {
            credentials: "same-origin",
            cache: "force-cache",
          });
          if (!res.ok) return;
          const blob = await res.blob();
          // Revoke previous if any (shouldn't happen)
          const prev = blobUrls.get(path);
          if (prev) URL.revokeObjectURL(prev);
          blobUrls.set(path, URL.createObjectURL(blob));
        } catch {
          // ignore — may already be offline without prior cache
        }
      }),
    );
    notify();
  })();

  return warming;
}
