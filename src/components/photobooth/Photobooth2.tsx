"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera2 } from "@/hooks/useCamera2";

const COUNTDOWN_SECONDS = 3;
export const PHOTO_STORAGE_KEY = "photoboothShot";

// Camera fills the full 1200x1784 output canvas; the overlay frame defines the
// visible photo window. Adjust these only if you need to inset the camera again.
const FRAME_AREA = {
  top: 0,
  bottom: 100,
  left: 0,
  right: 0,
} as const;

// Output (composite) ratio matches the frame artwork (1200x1784).
const OUTPUT_W = 1200;
const OUTPUT_H = 1784;

// Camera capture preference (portrait 9:16). The on-screen preview also uses
// this ratio; the composite is then re-fit to OUTPUT_W x OUTPUT_H.
const CAMERA_W = 1080;
const CAMERA_H = 1920;

const FRAME_OPTIONS = ["/images/Z-TT1.png", "/images/Z-TT2.png"] as const;
type FrameSrc = (typeof FRAME_OPTIONS)[number];

function pickRandomFrame(): FrameSrc {
  return FRAME_OPTIONS[Math.floor(Math.random() * FRAME_OPTIONS.length)];
}

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
  frameSrc: FrameSrc,
): Promise<string | null> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_W;
  canvas.height = OUTPUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const front = await loadImage(frameSrc);

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);

  const ax = (FRAME_AREA.left / 100) * OUTPUT_W;
  const ay = (FRAME_AREA.top / 100) * OUTPUT_H;
  const aw = ((100 - FRAME_AREA.left - FRAME_AREA.right) / 100) * OUTPUT_W;
  const ah = ((FRAME_AREA.bottom - FRAME_AREA.top) / 100) * OUTPUT_H;

  drawCover(ctx, video, vw, vh, ax, ay, aw, ah, mirror);

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
  const [frameSrc, setFrameSrc] = useState<FrameSrc>(FRAME_OPTIONS[0]);
  const [printing, setPrinting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setFrameSrc(pickRandomFrame());
  }, []);

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
      router.push("/zamna/result");
    },
    [router],
  );

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !ready || busy) return;
    setBusy(true);
    setFlash(true);
    try {
      const dataUrl = await compositeShot(video, mirror, frameSrc);
      if (dataUrl) setPreviewShot(dataUrl);
    } finally {
      setTimeout(() => setFlash(false), 180);
      setBusy(false);
    }
  }, [videoRef, ready, busy, mirror, frameSrc]);

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
    setFrameSrc(pickRandomFrame());
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
      if (
        previewShot &&
        !printing &&
        (e.key === "r" || e.key === "R")
      ) {
        e.preventDefault();
        retake();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewShot, printing, beginCountdown, confirmDownload, retake]);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black">
      <div
        className="relative mx-auto h-[min(100dvh,calc(100vw*1784/1200))] w-[min(100vw,calc(100dvh*1200/1784))] [container-type:inline-size] mt-[-7rem]"
        style={{ aspectRatio: "1200 / 1784" }}
      >
        <div className="absolute inset-0 z-10 overflow-hidden bg-black">
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
          key={frameSrc}
          src={frameSrc}
          alt=""
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 800px"
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
          className="absolute bottom-[-14.5cqw] left-1/2 z-30 w-[70%] -translate-x-1/2 outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-0 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Image
            src="/images/Z-CAPTURE.png"
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
            <p className="mb-[3cqw] text-[4vw] font-semibold uppercase tracking-[0.2em] text-[#F96D21]">
              THE PHOTO
            </p>
            <div className="relative w-[60vw] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
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
                disabled={printing}
                className="flex-1 rounded-full border-2 border-[#F96D21] bg-transparent px-[3cqw] py-[3cqw] text-[4vw] font-bold uppercase tracking-wide text-[#F96D21] outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={confirmDownload}
                disabled={printing}
                className="flex-1 rounded-full bg-[#F96D21] px-[3cqw] py-[3cqw] text-[4vw] font-bold uppercase tracking-wide text-[#0a0a3a] outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {printing ? "Printing…" : "Download"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
