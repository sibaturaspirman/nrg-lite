"use client";

import { ButikImage as Image } from "@/components/butik/ButikImage";
import { useEffect } from "react";
import { Great_Vibes, Montserrat } from "next/font/google";
import { butikPush } from "@/components/butik/butikNav";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const electricScript = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
});

export function ButikHomeLanding() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        butikPush("/butik/tnc");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={`flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black ${montserrat.className}`}
    >
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
          onClick={() => butikPush("/butik/tnc")}
          aria-label="Mulai photobooth"
          className="group absolute inset-0 z-10 flex flex-col items-center justify-center px-[6cqw] text-center text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/bt/logo.png"
            alt="Logo"
            width={400}
            height={120}
            priority
            className="h-auto w-[80vw] object-contain -mt-[28cqw]"
          />

          <Image
            src="/images/bt/btn-ready.png"
            alt="Click to begin"
            width={900}
            height={180}
            priority
            className="absolute bottom-[15cqw] left-1/2 h-auto w-[80vw] -translate-x-1/2 object-contain transition-transform duration-200 group-hover:scale-[1.02] group-active:scale-[0.98]"
          />
        </button>
      </div>
    </div>
  );
}
