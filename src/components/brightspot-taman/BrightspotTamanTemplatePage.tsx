"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import {
  BRIGHTSPOT_TAMAN_PHOTO_KEY,
  BRIGHTSPOT_TAMAN_PHOTO_URL_KEY,
  BRIGHTSPOT_TAMAN_PRINT_KEY,
  BRIGHTSPOT_TAMAN_SHOTS_KEY,
} from "@/components/brightspot-taman/BrightspotTamanPhotobooth";

import "swiper/css";
import "swiper/css/pagination";
import "./BrightspotTamanTemplatePage.css";

const TEMPLATES = [
  "/images/bt/t1.png",
  "/images/bt/t2.png",
  "/images/bt/t3.png",
] as const;

/** Native template size (t1/t2/t3 are identical). */
export const STRIP_W = 1182;
export const STRIP_H = 3544;
export const STRIP_ASPECT = `${STRIP_W} / ${STRIP_H}`;

/**
 * Photo slots — size is % of strip WIDTH; height uses the same px → 1:1.
 * Tuned to match the reference photo-strip layout.
 */
const PHOTO_LAYOUT = {
  left: 0.1,
  size: 0.8,
  top: 0.04,
  gap: 0.024,
} as const;

function photoSlotRect(index: number) {
  const size = STRIP_W * PHOTO_LAYOUT.size;
  const left = STRIP_W * PHOTO_LAYOUT.left;
  const gap = STRIP_H * PHOTO_LAYOUT.gap;
  const top = STRIP_H * PHOTO_LAYOUT.top + index * (size + gap);
  return { left, top, size };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const sw = src.naturalWidth;
  const sh = src.naturalHeight;
  const sourceRatio = sw / sh;
  const targetRatio = dw / dh;
  let cropW = sw;
  let cropH = sh;
  let cropX = 0;
  let cropY = 0;
  if (sourceRatio > targetRatio) {
    cropW = sh * targetRatio;
    cropX = (sw - cropW) / 2;
  } else {
    cropH = sw / targetRatio;
    cropY = (sh - cropH) / 2;
  }
  ctx.drawImage(src, cropX, cropY, cropW, cropH, dx, dy, dw, dh);
}

async function compositeStrip(
  shots: string[],
  templateSrc: string,
): Promise<string> {
  const template = await loadImage(templateSrc);
  const width = template.naturalWidth || STRIP_W;
  const height = template.naturalHeight || STRIP_H;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(template, 0, 0, width, height);

  const scaleX = width / STRIP_W;
  const scaleY = height / STRIP_H;

  for (let i = 0; i < 3; i++) {
    const shot = shots[i];
    if (!shot) continue;
    const img = await loadImage(shot);
    const { left, top, size } = photoSlotRect(i);
    // Keep slots exactly 1:1 in template pixel space
    const s = size * scaleX;
    drawCover(ctx, img, left * scaleX, top * scaleY, s, s);
  }

  // Max JPEG quality for print + QR source
  return canvas.toDataURL("image/jpeg", 1);
}

/** Side-by-side duplicate for 4R (dibagi 2 kiri–kanan). */
async function buildDualStrip(stripSrc: string): Promise<string> {
  const strip = await loadImage(stripSrc);
  const w = strip.naturalWidth;
  const h = strip.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  // 1:1 pixel copy — no resampling blur
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(strip, 0, 0, w, h);
  ctx.drawImage(strip, w, 0, w, h);
  return canvas.toDataURL("image/jpeg", 1);
}

function StripPreview({
  templateSrc,
  shots,
}: {
  templateSrc: string;
  shots: string[];
}) {
  return (
    <div
      className="relative h-full max-h-full w-auto max-w-full overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
      style={{ aspectRatio: STRIP_ASPECT }}
    >
      <Image
        src={templateSrc}
        alt=""
        fill
        priority
        sizes="50vw"
        className="object-cover"
      />
      {shots.map((shot, i) => {
        const { left, top, size } = photoSlotRect(i);
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
  const router = useRouter();
  const [shots, setShots] = useState<string[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let parsed: string[] | null = null;
    try {
      const raw = sessionStorage.getItem(BRIGHTSPOT_TAMAN_SHOTS_KEY);
      if (raw) {
        const data = JSON.parse(raw) as unknown;
        if (
          Array.isArray(data) &&
          data.length === 3 &&
          data.every((x) => typeof x === "string")
        ) {
          parsed = data;
        }
      }
    } catch {
      parsed = null;
    }
    if (!parsed) {
      router.replace("/brightspot-taman/booth");
      return;
    }
    setShots(parsed);
  }, [router]);

  const confirmTemplate = useCallback(async () => {
    if (!shots || busy) return;
    setBusy(true);
    try {
      const strip = await compositeStrip(shots, TEMPLATES[activeIndex]);
      const dual = await buildDualStrip(strip);
      try {
        // Free booth shots so composited strip (+ 4R dual) fit in sessionStorage
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_SHOTS_KEY);
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_PHOTO_URL_KEY);
        sessionStorage.setItem(BRIGHTSPOT_TAMAN_PHOTO_KEY, strip);
        sessionStorage.setItem(BRIGHTSPOT_TAMAN_PRINT_KEY, dual);
      } catch {
        // retry strip-only if dual blows quota
        try {
          sessionStorage.removeItem(BRIGHTSPOT_TAMAN_PRINT_KEY);
          sessionStorage.setItem(BRIGHTSPOT_TAMAN_PHOTO_KEY, strip);
        } catch {
          // ignore; print page can rebuild dual from strip
        }
      }
      router.push("/brightspot-taman/print");
    } catch {
      setBusy(false);
    }
  }, [shots, busy, activeIndex, router]);

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
                <SwiperSlide key={src} className="!flex h-full items-center justify-center">
                  <StripPreview templateSrc={src} shots={shots} />
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
