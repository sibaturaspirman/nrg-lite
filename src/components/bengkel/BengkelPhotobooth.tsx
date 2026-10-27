"use client";

import { BengkelImage as Image } from "@/components/bengkel/BengkelImage";
import { bengkelPush } from "@/components/bengkel/bengkelNav";
import { setBengkelShots } from "@/components/bengkel/bengkelSession";
import {
  BENGKEL_FRAME,
  CAPTURE_H,
  CAPTURE_RATIO,
  CAPTURE_W,
  FRAME_ASPECT,
  FRAME_H,
  FRAME_W,
  compositeFramedCapture,
  warmStripAssets,
} from "@/components/bengkel/bengkelStrip";
import { useCamera2 } from "@/hooks/useCamera2";
import { useCallback, useEffect, useRef, useState } from "react";

const COUNTDOWN_SECONDS = 5;
const TOTAL_SHOTS = 1;
const MAX_OUTPUT_LONG_EDGE = 3840;

export const BENGKEL_PHOTO_KEY = "bengkelShot";
export const BENGKEL_PHOTO_URL_KEY = "bengkelUploadedUrl";
export const BENGKEL_SHOTS_KEY = "bengkelShots";
export const BENGKEL_PRINT_KEY = "bengkelPrint";
export const BENGKEL_TEMPLATE_INDEX_KEY = "bengkelTemplateIndex";

function captureFrame(
  video: HTMLVideoElement,
  mirror: boolean,
): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const sourceRatio = vw / vh;
  let cropW = vw;
  let cropH = vh;
  let cropX = 0;
  let cropY = 0;
  if (sourceRatio > CAPTURE_RATIO) {
    cropW = vh * CAPTURE_RATIO;
    cropX = (vw - cropW) / 2;
  } else {
    cropH = vw / CAPTURE_RATIO;
    cropY = (vh - cropH) / 2;
  }

  let outW: number = CAPTURE_W;
  let outH: number = CAPTURE_H;
  const longEdge = Math.max(outW, outH);
  if (longEdge > MAX_OUTPUT_LONG_EDGE) {
    const scale = MAX_OUTPUT_LONG_EDGE / longEdge;
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (mirror) {
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  return canvas.toDataURL("image/jpeg", 1);
}

export function BengkelPhotobooth() {
  const { videoRef, start, stop, error, ready } = useCamera2({
    facingMode: "user",
    width: FRAME_W,
    height: FRAME_H,
  });
  const mirror = false;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shotsRef = useRef<(string | null)[]>([null]);
  const nextSlotRef = useRef(0);
  const capturingRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const beginCountdownRef = useRef<() => void>(() => {});

  const allDone = shotsRef.current.some(Boolean);

  useEffect(() => {
    warmStripAssets();
    void start();
    return () => stop();
  }, [start, stop]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const finishSession = useCallback((finalShots: string[]) => {
    setPreparing(true);
    try {
      sessionStorage.removeItem(BENGKEL_PHOTO_URL_KEY);
      sessionStorage.removeItem(BENGKEL_TEMPLATE_INDEX_KEY);
      sessionStorage.removeItem(BENGKEL_PHOTO_KEY);
      sessionStorage.removeItem("bengkelZynSessionCurrent");
    } catch {
      // ignore
    }
    setBengkelShots(finalShots);
    bengkelPush("/bengkel/result");
  }, []);

  const takePhoto = useCallback(async () => {
    if (capturingRef.current) return;
    const video = videoRef.current;
    if (!video || !ready) return;

    const slot = nextSlotRef.current;
    if (slot < 0 || slot >= TOTAL_SHOTS) return;

    capturingRef.current = true;
    setBusy(true);
    setFlash(true);

    const raw = captureFrame(video, mirror);
    if (!raw) {
      capturingRef.current = false;
      setBusy(false);
      setTimeout(() => setFlash(false), 180);
      return;
    }

    let framed: string;
    try {
      framed = await compositeFramedCapture(raw, BENGKEL_FRAME);
    } catch {
      capturingRef.current = false;
      setBusy(false);
      setTimeout(() => setFlash(false), 180);
      return;
    }

    nextSlotRef.current = slot + 1;

    const nextShots = [...shotsRef.current];
    nextShots[slot] = framed;
    shotsRef.current = nextShots;
    setTimeout(() => setFlash(false), 180);
    capturingRef.current = false;
    setBusy(false);

    setTimeout(() => {
      finishSession(nextShots.filter((s): s is string => Boolean(s)));
    }, 500);
  }, [videoRef, ready, mirror, finishSession]);

  const beginCountdown = useCallback(() => {
    if (!ready || timerRef.current || allDone || capturingRef.current) return;

    clearTimer();
    let remaining = COUNTDOWN_SECONDS;
    setCountdown(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearTimer();
        setCountdown(null);
        void takePhoto();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [ready, allDone, clearTimer, takePhoto]);

  beginCountdownRef.current = beginCountdown;

  const startSession = useCallback(() => {
    if (
      !ready ||
      sessionStartedRef.current ||
      timerRef.current ||
      busy ||
      allDone ||
      preparing ||
      nextSlotRef.current > 0
    ) {
      return;
    }
    sessionStartedRef.current = true;
    beginCountdown();
  }, [ready, busy, allDone, preparing, beginCountdown]);

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
        startSession();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startSession]);

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

        <div className="absolute inset-[2.8cqw] z-10 flex flex-col items-center px-[5cqw] pb-[10cqw] pt-[10cqw]">
          <Image
            src="/images/bengkel/title-booth.png"
            alt="Curiosity looks good on you!"
            width={900}
            height={160}
            priority
            className="h-auto w-[60%] object-contain"
          />

          <div
            className="relative mt-[4cqw] w-[74%] shrink-0 overflow-hidden bg-black"
            style={{ aspectRatio: FRAME_ASPECT }}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 z-10 h-full w-full object-cover"
              style={{ transform: mirror ? "scaleX(-1)" : undefined }}
              playsInline
              muted
            />
            <Image
              src={BENGKEL_FRAME}
              alt=""
              fill
              priority
              sizes="(max-width: 1080px) 74vw, 520px"
              className="pointer-events-none absolute inset-0 z-20 object-cover"
            />
            {!ready && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[clamp(0.75rem,3.2cqw,1rem)] text-white/80">
                Memuat kamera…
              </div>
            )}
            {countdown !== null && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25">
                <span className="text-[clamp(4rem,28cqw,10rem)] font-extrabold leading-none tabular-nums text-white drop-shadow-[0_0_30px_rgba(0,0,0,0.6)]">
                  {countdown}
                </span>
              </div>
            )}
            {flash && (
              <div className="pointer-events-none absolute inset-0 z-30 animate-pulse bg-white/80" />
            )}
            {preparing && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 text-[clamp(0.75rem,3.2cqw,1rem)] text-white">
                Menyiapkan hasil…
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={startSession}
            disabled={
              !ready ||
              countdown !== null ||
              busy ||
              allDone ||
              preparing
            }
            aria-label="Ambil foto"
            className="mt-auto w-[88%] outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Image
              src="/images/shoreline/btn-capture.png"
              alt="Capture"
              width={1000}
              height={160}
              priority
              className="h-auto w-full object-contain"
            />
          </button>
        </div>

        {error &&
          !/play\(\) request was interrupted/i.test(error) && (
          <div className="absolute left-[5cqw] right-[5cqw] top-[3cqw] z-40 rounded-lg bg-red-900/85 px-3 py-2 text-center text-[clamp(0.65rem,2.6cqw,0.85rem)] text-white">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
