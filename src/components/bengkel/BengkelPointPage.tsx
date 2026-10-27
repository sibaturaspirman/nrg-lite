"use client";

import { BengkelImage as Image } from "@/components/bengkel/BengkelImage";
import { useEffect } from "react";
import { bengkelPush } from "@/components/bengkel/bengkelNav";

export function BengkelPointPage() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        bengkelPush("/bengkel");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black">
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] [container-type:inline-size]"
        style={{ aspectRatio: "9 / 16" }}
      >
        <Image
          src="/images/shoreline/bg.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />

        <Image
          src="/images/bengkel/you-got.png"
          alt=""
          priority
          width={491}
          height={32}
          className="object-contain absolute left-0 right-0 bottom-[10vh] mx-auto"
        />

        <button
          type="button"
          onClick={() => bengkelPush("/bengkel")}
          aria-label="Selesai, kembali ke beranda"
          className="group absolute inset-0 z-10 flex items-center justify-center px-[6cqw] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/bengkel/collect.png"
            alt="You got +200 points — scan QR code to collect point"
            width={1080}
            height={1600}
            priority
            className="h-auto w-[90vw] object-contain transition-transform duration-200 group-hover:scale-[1.01] group-active:scale-[0.99]"
          />
        </button>
      </div>
    </div>
  );
}
