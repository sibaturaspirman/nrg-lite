"use client";

import Image from "next/image";
import { useEffect } from "react";
import { btPush } from "@/components/brightspot-taman/btNav";

export function BrightspotTamanTncPage() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        btPush("/brightspot-taman/ready");
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
          onClick={() => btPush("/brightspot-taman/ready")}
          aria-label="Saya setuju, lanjutkan"
          className="group absolute inset-0 z-10 flex items-center justify-center px-[6cqw] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/bt/tnc.png"
            alt="Before you continue — tap OK to agree"
            width={1080}
            height={1600}
            priority
            className="h-auto w-[80vw] object-contain transition-transform duration-200 group-hover:scale-[1.01] group-active:scale-[0.99]"
          />
        </button>
      </div>
    </div>
  );
}
