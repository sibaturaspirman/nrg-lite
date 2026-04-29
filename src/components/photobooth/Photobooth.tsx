"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";

const COUNTDOWN_SECONDS = 3;
export const PHOTO_STORAGE_KEY = "photoboothShot";

// Inner camera area inside frame-back.jpg, expressed as percentages of the
// 1080x1920 (9:16) canvas. Tweak these if the visible frame moves.
const FRAME_AREA = {
  top: 18.5,
  bottom: 95.5,
  left: 5.5,
  right: 5.5,
} as const;

const OUTPUT_W = 1080;
const OUTPUT_H = 1920;

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
  src: HTMLImageElement | HTMLVideoElement,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  mirror = false,
) {
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
  ctx.save();
  if (mirror) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, dw, dh);
  } else {
    ctx.drawImage(src, cropX, cropY, cropW, cropH, dx, dy, dw, dh);
  }
  ctx.restore();
}

async function compositeShot(
  video: HTMLVideoElement,
  mirror: boolean,
): Promise<string | null> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_W;
  canvas.height = OUTPUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const [back, front] = await Promise.all([
    loadImage("/images/frame-back.jpg"),
    loadImage("/images/frame-front.png"),
  ]);

  drawCover(
    ctx,
    back,
    back.naturalWidth,
    back.naturalHeight,
    0,
    0,
    OUTPUT_W,
    OUTPUT_H,
  );

  const ax = (FRAME_AREA.left / 100) * OUTPUT_W;
  const ay = (FRAME_AREA.top / 100) * OUTPUT_H;
  const aw = ((100 - FRAME_AREA.left - FRAME_AREA.right) / 100) * OUTPUT_W;
  const ah = ((FRAME_AREA.bottom - FRAME_AREA.top) / 100) * OUTPUT_H;

  const radius = 16;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(ax, ay, aw, ah, radius);
  ctx.clip();
  drawCover(ctx, video, vw, vh, ax, ay, aw, ah, mirror);
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(ax, ay, aw, ah, radius);
  ctx.stroke();
  ctx.restore();

  drawCover(
    ctx,
    front,
    front.naturalWidth,
    front.naturalHeight,
    0,
    0,
    OUTPUT_W,
    OUTPUT_H,
  );

  return canvas.toDataURL("image/png");
}

export function Photobooth() {
  const router = useRouter();
  const { videoRef, start, stop, error, ready } = useCamera({
    facingMode: "user",
  });
  const mirror = true;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [previewShot, setPreviewShot] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goToResult = useCallback(
    (dataUrl: string) => {
      try {
        sessionStorage.setItem(PHOTO_STORAGE_KEY, dataUrl);
        sessionStorage.removeItem("photoboothUploadedUrl");
      } catch {
        // sessionStorage may fail (quota / disabled); navigate anyway
      }
      router.push("/result");
    },
    [router],
  );

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !ready || busy) return;
    setBusy(true);
    setFlash(true);
    try {
      const dataUrl = await compositeShot(video, mirror);
      if (dataUrl) setPreviewShot(dataUrl);
    } finally {
      setTimeout(() => setFlash(false), 180);
      setBusy(false);
    }
  }, [videoRef, ready, busy, mirror]);

  const beginCountdown = useCallback(() => {
    if (!ready || countdown !== null || busy || previewShot) return;
    clearTimer();
    setCountdown(COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((n) => {
        if (n === null) {
          clearTimer();
          return null;
        }
        if (n <= 1) {
          clearTimer();
          queueMicrotask(() => {
            void takePhoto();
            setCountdown(null);
          });
          return null;
        }
        return n - 1;
      });
    }, 1000);
  }, [ready, countdown, busy, previewShot, clearTimer, takePhoto]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const retake = useCallback(() => {
    setPreviewShot(null);
  }, []);

  const confirmDownload = useCallback(() => {
    if (!previewShot) return;
    goToResult(previewShot);
  }, [previewShot, goToResult]);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black">
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] [container-type:inline-size]"
        style={{ aspectRatio: "9 / 16" }}
      >
        <Image
          src="/images/frame-back.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />

        <div
          className="absolute z-10 overflow-hidden rounded-[2rem] border-[8px] border-white bg-black"
          style={{
            top: `${FRAME_AREA.top}%`,
            bottom: `${100 - FRAME_AREA.bottom}%`,
            left: `${FRAME_AREA.left}%`,
            right: `${FRAME_AREA.right}%`,
          }}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            style={{ transform: mirror ? "scaleX(-1)" : undefined }}
            playsInline
            muted
          />
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-[6vw] text-white/70">
              Memuat kamera…
            </div>
          )}
        </div>

        <Image
          src="/images/frame-front.png"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="pointer-events-none z-20 object-cover"
        />

        {countdown !== null && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <span className="text-[clamp(5rem,32cqw,14rem)] font-extrabold leading-none tabular-nums text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.6)]">
              {countdown}
            </span>
          </div>
        )}

        {flash && (
          <div className="pointer-events-none absolute inset-0 z-40 animate-pulse bg-white/80" />
        )}

        <button
          type="button"
          onClick={beginCountdown}
          disabled={!ready || countdown !== null || busy}
          aria-label="Ambil foto"
          className="absolute bottom-[15.5cqw] left-1/2 z-30 w-[70%] -translate-x-1/2 outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/I-CAPTURE.png"
            alt=""
            width={1000}
            height={200}
            priority
            className="h-auto w-full object-contain"
          />
        </button>

        {error && (
          <div className="absolute left-[5cqw] right-[5cqw] top-[3cqw] z-40 rounded-lg bg-red-900/85 px-3 py-2 text-center text-[clamp(0.65rem,2.6cqw,0.85rem)] text-white opacity-0">
            {error}
          </div>
        )}

        {previewShot && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pratinjau foto"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-[5cqw] py-[6cqw] backdrop-blur-sm"
          >
            <p className="mb-[3cqw] text-[4vw] font-semibold uppercase tracking-[0.2em] text-[#00CECE]">
              Hasil foto
            </p>
            <div className="relative w-[60vw] overflow-hidden rounded-xl border-2 border-white shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
              <Image
                src={previewShot}
                alt="Foto baru"
                width={1080}
                height={1920}
                unoptimized
                priority
                className="h-auto w-full"
              />
            </div>
            <div className="mt-[6cqw] flex w-full items-stretch gap-[3cqw]">
              <button
                type="button"
                onClick={retake}
                className="flex-1 rounded-full border-2 border-[#00CECE] bg-transparent px-[3cqw] py-[3cqw] text-[4vw] font-bold uppercase tracking-wide text-[#00CECE] outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={confirmDownload}
                className="flex-1 rounded-full bg-[#00CECE] px-[3cqw] py-[3cqw] text-[4vw] font-bold uppercase tracking-wide text-[#0a0a3a] outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
