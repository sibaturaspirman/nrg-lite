"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Legacy offline fallback URL — immediately boot into the photobooth app
 * so offline users never get stuck on "You're offline".
 */
export default function OfflinePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/brightspot-taman");
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black text-white/70">
      Membuka photobooth…
    </div>
  );
}
