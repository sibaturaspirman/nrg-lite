"use client";

import { useEffect } from "react";

/**
 * Legacy Serwist offline URL — boot into the photobooth, never show
 * a "You're offline" dead-end.
 */
export default function OfflinePage() {
  useEffect(() => {
    window.location.replace("/shoreline");
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#1a0508] text-white/70">
      Membuka photobooth…
    </div>
  );
}
