"use client";

import { useEffect } from "react";

/**
 * Legacy offline fallback URL — immediately boot into the photobooth app
 * so offline users never get stuck on "You're offline".
 */
export default function OfflinePage() {
  useEffect(() => {
    // Hard navigation — works offline via SW navigateFallback / precache
    window.location.replace("/brightspot-taman");
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black text-white/70">
      Membuka photobooth…
    </div>
  );
}
