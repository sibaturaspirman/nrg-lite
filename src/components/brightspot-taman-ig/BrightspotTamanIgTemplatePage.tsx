"use client";

import { BtIgImage as Image } from "@/components/brightspot-taman-ig/BtIgImage";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  BrightspotTamanIgLayoutSettings,
  useSlotLayouts,
} from "@/components/brightspot-taman-ig/BrightspotTamanIgLayoutSettings";
import {
  BRIGHTSPOT_TAMAN_IG_PHOTO_URL_KEY,
  BRIGHTSPOT_TAMAN_IG_TEMPLATE_INDEX_KEY,
} from "@/components/brightspot-taman-ig/BrightspotTamanIgPhotobooth";
import { btigPush, btigReplace } from "@/components/brightspot-taman-ig/btigNav";
import {
  clearBrightspotTamanIgShots,
  getBrightspotTamanIgShots,
  setBrightspotTamanIgPhoto,
} from "@/components/brightspot-taman-ig/brightspotTamanIgSession";
import {
  DEFAULT_PREVIEW_LAYOUT,
  STRIP_H,
  STRIP_W,
  TEMPLATES,
  compositeStrip,
  photoSlotRect,
  warmStripAssets,
  type SlotLayout,
} from "@/components/brightspot-taman-ig/brightspotTamanIgStrip";

import "swiper/css";
import "swiper/css/pagination";
import "./BrightspotTamanIgTemplatePage.css";

export { STRIP_H, STRIP_W };

const STRIP_AR = STRIP_W / STRIP_H;

function StripPreview({
  templateSrc,
  shots,
  layout,
}: {
  templateSrc: string;
  shots: string[];
  layout: SlotLayout;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const shiftPct = (layout.shiftX ?? 0) * 100;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const pw = host.clientWidth;
      const ph = host.clientHeight;
      if (pw <= 0 || ph <= 0) return;
      let h = ph;
      let w = h * STRIP_AR;
      if (w > pw) {
        w = pw;
        h = w / STRIP_AR;
      }
      setBox({ w: Math.round(w), h: Math.round(h) });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className="flex h-full w-full items-center justify-center"
    >
      {box.w > 0 && (
        <div
          className="relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          style={{ width: box.w, height: box.h }}
        >
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
            const { left, top, width, height } = photoSlotRect(i, layout);
            return (
              <div
                key={i}
                className="absolute overflow-hidden"
                style={{
                  left: `${(left / STRIP_W) * 100}%`,
                  top: `${(top / STRIP_H) * 100}%`,
                  width: `${(width / STRIP_W) * 100}%`,
                  height: `${(height / STRIP_H) * 100}%`,
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
      )}
    </div>
  );
}

export function BrightspotTamanIgTemplatePage() {
  const [shots, setShots] = useState<string[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const { layouts, setLayouts } = useSlotLayouts();

  // Always use landscape IG defaults unless settings panel saved a valid layout.
  const previewLayout: SlotLayout =
    layouts.preview.cellW > layouts.preview.cellH
      ? layouts.preview
      : DEFAULT_PREVIEW_LAYOUT;

  useEffect(() => {
    warmStripAssets();
    const parsed = getBrightspotTamanIgShots();
    if (!parsed) {
      btigReplace("/brightspot-taman-ig/booth");
      return;
    }
    setShots(parsed);
  }, []);

  const confirmTemplate = useCallback(async () => {
    if (!shots || busy) return;
    setBusy(true);
    try {
      const previewSrc = TEMPLATES[activeIndex];
      const strip = await compositeStrip(shots, previewSrc, previewLayout);
      try {
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_IG_PHOTO_URL_KEY);
        sessionStorage.setItem(
          BRIGHTSPOT_TAMAN_IG_TEMPLATE_INDEX_KEY,
          String(activeIndex),
        );
      } catch {
        // ignore
      }
      setBrightspotTamanIgPhoto(strip);
      clearBrightspotTamanIgShots();
      btigPush("/brightspot-taman-ig/result");
    } catch {
      setBusy(false);
    }
  }, [shots, busy, activeIndex, previewLayout]);

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

        <BrightspotTamanIgLayoutSettings
          layouts={layouts}
          onChange={setLayouts}
        />

        <div className="absolute inset-[7.8cqw] z-10 flex flex-col items-center justify-between px-[2cqw] py-[22cqw]">
          <Image
            src="/images/bt/title-template.png"
            alt="Generating your masterpiece moment"
            width={900}
            height={160}
            priority
            className="h-auto w-[75%] shrink-0 object-contain"
          />

          <div className="btig-template-swiper w-[82%] min-h-0 flex-1">
            <Swiper
              modules={[Pagination]}
              centeredSlides
              slidesPerView={1.35}
              spaceBetween={14}
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
                    layout={previewLayout}
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
            className="w-[65%] shrink-0 outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white/70 mt-[5vw]"
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
