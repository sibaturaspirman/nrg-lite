"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function WeddingHomeLanding() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        router.push("/wedding/tnc");
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
          href="/wedding/tnc"
          aria-label="Mulai photobooth"
          className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/wedding/home.jpg"
            alt="The Wedding of Agit & Deri — Wedding Photobooth. Tap anywhere to start."
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
