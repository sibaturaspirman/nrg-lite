"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearWeddingPhotoUrl,
  setWeddingPhoto,
} from "@/components/wedding/weddingSession";
import { useCamera2 } from "@/hooks/useCamera2";

const COUNTDOWN_SECONDS = 3;

/** Photo window inside template4.png (1200×1770), as % of canvas. */
const FRAME_AREA = {
  top: 3.503,
  bottom: 71.582,
  left: 5.833,
  right: 5.167,
} as const;

/** Native template size — no downscale. */
const OUTPUT_W = 1200;
const OUTPUT_H = 1770;

const CAMERA_W = 1200;
const CAMERA_H = 1770;

const WEDDING_TEMPLATE = "/images/wedding/template4.png";

function printImage(dataUrl: string): Promise<void> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      try {
        iframe.remove();
      } catch {
        // ignore
      }
      resolve();
    };

    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      const onDone = () => {
        win.removeEventListener("afterprint", onDone);
        setTimeout(cleanup, 200);
      };
      win.addEventListener("afterprint", onDone);
      // Safety net if the dialog is dismissed without firing afterprint
      setTimeout(cleanup, 60000);
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
      }
    };

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Print photo</title>
    <style>
      @page { margin: 0; }
      html, body { margin: 0; padding: 0; }
      img { display: block; width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" alt="" />
  </body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    iframe.src = URL.createObjectURL(blob);
    document.body.appendChild(iframe);
  });
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

  const front = await loadImage(WEDDING_TEMPLATE);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);

  const ax = (FRAME_AREA.left / 100) * OUTPUT_W;
  const ay = (FRAME_AREA.top / 100) * OUTPUT_H;
  const aw = ((100 - FRAME_AREA.left - FRAME_AREA.right) / 100) * OUTPUT_W;
  const ah = ((FRAME_AREA.bottom - FRAME_AREA.top) / 100) * OUTPUT_H;

  drawCover(ctx, video, vw, vh, ax, ay, aw, ah, mirror);

  // Draw template at 1:1 native pixels (no resize compression).
  ctx.drawImage(front, 0, 0, OUTPUT_W, OUTPUT_H);

  // Lossless PNG for print + upload — no JPEG compression.
  return canvas.toDataURL("image/png");
}

export function WeddingPhotobooth() {
  const router = useRouter();
  const { videoRef, start, stop, error, ready } = useCamera2({
    facingMode: "user",
    width: CAMERA_W,
    height: CAMERA_H,
  });
  const mirror = true;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [previewShot, setPreviewShot] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
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
      setWeddingPhoto(dataUrl);
      clearWeddingPhotoUrl();
      router.push("/wedding/result");
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

  const confirmDownload = useCallback(async () => {
    if (!previewShot || printing) return;
    setPrinting(true);
    try {
      await printImage(previewShot);
    } catch {
      // ignore print errors and continue to result page
    }
    goToResult(previewShot);
  }, [previewShot, printing, goToResult]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (previewShot) void confirmDownload();
        else beginCountdown();
        return;
      }
      if (previewShot && !printing && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        retake();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewShot, printing, beginCountdown, confirmDownload, retake]);

  return (
    <div className="flex min-h-[100dvh] w-full items-start justify-center overflow-hidden bg-[#F5F5F5]">
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*1770/1200))] w-[min(100vw,calc(100dvh*1200/1770))] [container-type:inline-size]"
        style={{ aspectRatio: "1200 / 1770" }}
      >
        <div
          className="absolute z-10 overflow-hidden bg-black"
          style={{
            left: `${FRAME_AREA.left}%`,
            top: `${FRAME_AREA.top}%`,
            right: `${FRAME_AREA.right}%`,
            bottom: `${100 - FRAME_AREA.bottom}%`,
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
            <div className="absolute inset-0 flex items-center justify-center text-[clamp(0.75rem,3.5cqw,1rem)] text-white/70">
              Memuat kamera…
            </div>
          )}
        </div>

        <Image
          src={WEDDING_TEMPLATE}
          alt=""
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
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
          disabled={!ready || countdown !== null || busy || !!previewShot}
          aria-label="Ambil foto"
          className="absolute bottom-[-15.5cqw] left-1/2 z-30 w-[75%] -translate-x-1/2 outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-0 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/wedding/take.png"
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
      </div>

      {previewShot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto"
          className="fixed inset-0 z-50 flex h-[100dvh] min-h-[100dvh] w-full flex-col items-center justify-center bg-black/85 px-[5vw] py-[6vh] backdrop-blur-sm"
        >
          <p className="mb-[2vh] text-[4vw] font-semibold uppercase tracking-[0.2em] text-[#ffffff]">
            THE PHOTO
          </p>
          <div className="relative max-h-[68dvh] w-[80%] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            <Image
              src={previewShot}
              alt="Foto baru"
              width={1200}
              height={1770}
              unoptimized
              priority
              className="h-auto max-h-[68dvh] w-full object-contain"
            />
          </div>
          <div className="mt-[3vh] flex w-[80%] items-stretch gap-[3vw]">
            <button
              type="button"
              onClick={retake}
              disabled={printing}
              className="flex-1 rounded-full border-2 border-[#ffffff] bg-transparent px-[3vw] py-[2vh] text-[4vw] font-bold uppercase tracking-wide text-[#ffffff] outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={confirmDownload}
              disabled={printing}
              className="flex-1 rounded-full bg-[#ffffff] px-[3vw] py-[2vh] text-[4vw] font-bold uppercase tracking-wide text-[#0a0a3a] outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {printing ? "Printing…" : "Download"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
