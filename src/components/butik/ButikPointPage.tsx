"use client";

import { ButikImage as Image } from "@/components/butik/ButikImage";
import { useEffect } from "react";
import { butikPush } from "@/components/butik/butikNav";

export function ButikPointPage() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        butikPush("/butik");
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
          src="/images/bt/bg.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />

        <button
          type="button"
          onClick={() => butikPush("/butik")}
          aria-label="Selesai, kembali ke beranda"
          className="group absolute inset-0 z-10 flex items-center justify-center px-[6cqw] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/bt/you-got.png"
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
