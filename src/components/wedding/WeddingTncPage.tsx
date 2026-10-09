"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function WeddingTncPage() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        router.push("/wedding/booth");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black">
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] [container-type:inline-size]"
        style={{ aspectRatio: "9 / 16" }}
      >
        <Link
          href="/wedding/booth"
          aria-label="Lanjut ke booth"
          className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/wedding/tnc.jpg"
            alt="With Love & Gratitude — Next"
            fill
            priority
            sizes="(max-width: 1080px) 100vw, 608px"
            className="object-cover"
          />
        </Link>
      </div>
    </div>
  );
}
