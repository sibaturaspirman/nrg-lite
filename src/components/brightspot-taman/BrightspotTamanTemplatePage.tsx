"use client";

import { BtImage as Image } from "@/components/brightspot-taman/BtImage";
import { useCallback, useEffect, useState } from "react";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  BrightspotTamanLayoutSettings,
  useSlotLayouts,
} from "@/components/brightspot-taman/BrightspotTamanLayoutSettings";
import {
  BRIGHTSPOT_TAMAN_PHOTO_URL_KEY,
  BRIGHTSPOT_TAMAN_TEMPLATE_INDEX_KEY,
} from "@/components/brightspot-taman/BrightspotTamanPhotobooth";
import { btPush, btReplace } from "@/components/brightspot-taman/btNav";
import {
  clearBrightspotTamanShots,
  getBrightspotTamanShots,
  setBrightspotTamanPhoto,
  setBrightspotTamanPrint,
} from "@/components/brightspot-taman/brightspotTamanSession";
import {
  PRINT_TEMPLATES,
  STRIP_ASPECT,
  STRIP_H,
  STRIP_W,
  TEMPLATES,
  buildDualPrintStrip,
  compositeStrip,
  photoSlotRect,
  warmStripAssets,
  type SlotLayout,
} from "@/components/brightspot-taman/brightspotTamanStrip";

import "swiper/css";
import "swiper/css/pagination";
import "./BrightspotTamanTemplatePage.css";

export { STRIP_ASPECT, STRIP_H, STRIP_W };

function StripPreview({
  templateSrc,
  shots,
  layout,
}: {
  templateSrc: string;
  shots: string[];
  layout: SlotLayout;
}) {
  const shiftPct = (layout.shiftX ?? 0) * 100;
  return (
    <div
      className="relative h-full max-h-full w-auto max-w-full overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
      style={{ aspectRatio: STRIP_ASPECT }}
    >
      {/* Template only — photos stay fixed */}
      <div
        className="absolute inset-0"
        style={{ transform: `translateX(${shiftPct}%)` }}
      >
        <Image
          src={templateSrc}
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
      </div>
      {shots.map((shot, i) => {
        const { left, top, size } = photoSlotRect(i, layout);
        return (
          <div
            key={i}
            className="absolute overflow-hidden"
            style={{
              left: `${(left / STRIP_W) * 100}%`,
              top: `${(top / STRIP_H) * 100}%`,
              width: `${(size / STRIP_W) * 100}%`,
              height: `${(size / STRIP_H) * 100}%`,
            }}
          >
            <Image
              src={shot}
              alt={`Foto ${i + 1}`}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        );
      })}
    </div>
  );
}

export function BrightspotTamanTemplatePage() {
  const [shots, setShots] = useState<string[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const { layouts, setLayouts } = useSlotLayouts();

  useEffect(() => {
    warmStripAssets();
    const parsed = getBrightspotTamanShots();
    if (!parsed) {
      btReplace("/brightspot-taman/booth");
      return;
    }
    setShots(parsed);
  }, []);

  const confirmTemplate = useCallback(async () => {
    if (!shots || busy) return;
    setBusy(true);
    try {
      const previewSrc = TEMPLATES[activeIndex];
      const printSrc = PRINT_TEMPLATES[activeIndex];
      const [strip, dual] = await Promise.all([
        compositeStrip(shots, previewSrc, layouts.preview),
        buildDualPrintStrip(
          shots,
          printSrc,
          layouts.printLeft,
          layouts.printRight,
        ),
      ]);
      try {
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_PHOTO_URL_KEY);
        sessionStorage.setItem(
          BRIGHTSPOT_TAMAN_TEMPLATE_INDEX_KEY,
          String(activeIndex),
        );
      } catch {
        // ignore
      }
      // Memory-first — sessionStorage often can't hold max-quality strip + 4R dual
      setBrightspotTamanPhoto(strip);
      setBrightspotTamanPrint(dual);
      clearBrightspotTamanShots();
      btPush("/brightspot-taman/print");
    } catch {
      setBusy(false);
    }
  }, [shots, busy, activeIndex, layouts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void confirmTemplate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmTemplate]);

  if (!shots) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black text-white/70">
        Memuat…
      </div>
    );
  }

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

        <BrightspotTamanLayoutSettings
          layouts={layouts}
          onChange={setLayouts}
        />

        <div className="absolute inset-[7.8cqw] z-10 flex flex-col items-center justify-between px-[2cqw] py-[6cqw]">
          <Image
            src="/images/bt/title-template.png"
            alt="Generating your masterpiece moment"
            width={900}
            height={160}
            priority
            className="h-auto w-[75%] shrink-0 object-contain"
          />

          <div className="bt-template-swiper w-[80%] max-h-[80%] min-h-0 flex-1">
            <Swiper
              modules={[Pagination]}
              centeredSlides
              slidesPerView={1.55}
              spaceBetween={12}
              pagination={{ clickable: true }}
              onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
              className="h-full w-full"
            >
              {TEMPLATES.map((src) => (
                <SwiperSlide
                  key={src}
                  className="!flex h-full items-center justify-center"
                >
                  <StripPreview
                    templateSrc={src}
                    shots={shots}
                    layout={layouts.preview}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <button
            type="button"
            onClick={() => void confirmTemplate()}
            disabled={busy}
            aria-label="Lanjut"
            className="w-[65%] shrink-0 outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Image
              src="/images/bt/btn-next.png"
              alt="Next"
              width={1094}
              height={240}
              priority
              className="h-auto w-full object-contain"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
