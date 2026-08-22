"use client";

import { BtIgImage as Image } from "@/components/brightspot-taman-ig/BtIgImage";
import { useCallback, useEffect, useRef, useState } from "react";
import { btigPush } from "@/components/brightspot-taman-ig/btigNav";
import { setBrightspotTamanIgShots } from "@/components/brightspot-taman-ig/brightspotTamanIgSession";
import { useCamera2 } from "@/hooks/useCamera2";

const COUNTDOWN_SECONDS = 5;
const TOTAL_SHOTS = 3;
/** Brief pause after a shot before the next auto-countdown starts. */
const BETWEEN_SHOTS_MS = 700;
/** Target capture size (landscape 364×248). */
const CAPTURE_W = 364;
const CAPTURE_H = 248;
const OUTPUT_RATIO = CAPTURE_W / CAPTURE_H;
/** Cap longest edge so 4K streams don't explode sessionStorage. */
const MAX_OUTPUT_LONG_EDGE = 3840;

export const BRIGHTSPOT_TAMAN_IG_PHOTO_KEY = "brightspotTamanIgShot";
export const BRIGHTSPOT_TAMAN_IG_PHOTO_URL_KEY = "brightspotTamanIgUploadedUrl";
export const BRIGHTSPOT_TAMAN_IG_SHOTS_KEY = "brightspotTamanIgShots";
/** Dual left+right strip canvas for 4R print (dibagi 2). */
export const BRIGHTSPOT_TAMAN_IG_PRINT_KEY = "brightspotTamanIgPrint";
/** Selected template index (0–2) for print rebuild. */
export const BRIGHTSPOT_TAMAN_IG_TEMPLATE_INDEX_KEY = "brightspotTamanIgTemplateIndex";

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
  if (sourceRatio > OUTPUT_RATIO) {
    cropW = vh * OUTPUT_RATIO;
    cropX = (vw - cropW) / 2;
  } else {
    cropH = vw / OUTPUT_RATIO;
    cropY = (vh - cropH) / 2;
  }

  // Keep native crop size; only downscale if longer edge exceeds cap.
  let outW = CAPTURE_W;
  let outH = CAPTURE_H;
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

  // Max JPEG quality — do not downgrade capture
  return canvas.toDataURL("image/jpeg", 1);
}

function SlotPlaceholder({ index }: { index: number }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 140 95"
        className="pointer-events-none absolute inset-[14%] h-auto w-[72%] max-h-[72%] text-white"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <path
          d="M18 30 V16 H40 M100 16 H122 V30 M122 65 V79 H100 M40 79 H18 V65"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="square"
        />
      </svg>
      <span className="relative z-10 text-[clamp(0.9rem,4.2cqw,1.4rem)] font-semibold leading-none text-white">
        {index}
      </span>
    </div>
  );
}

export function BrightspotTamanIgPhotobooth() {
  const { videoRef, start, stop, error, ready } = useCamera2({
    facingMode: "user",
    width: 3840,
    height: 2160,
  });
  const mirror = true;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const [shots, setShots] = useState<(string | null)[]>([null, null, null]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shotsRef = useRef(shots);
  shotsRef.current = shots;
  /** Next slot to fill: 0 → 1 → 2 */
  const nextSlotRef = useRef(0);
  const capturingRef = useRef(false);
  const sessionStartedRef = useRef(false);
  const beginCountdownRef = useRef<() => void>(() => {});

  const shotCount = shots.filter(Boolean).length;
  const allDone = shotCount >= TOTAL_SHOTS;

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

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const finishSession = useCallback(
    (finalShots: string[]) => {
      setBrightspotTamanIgShots(finalShots);
      try {
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_IG_PHOTO_URL_KEY);
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_IG_PRINT_KEY);
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_IG_TEMPLATE_INDEX_KEY);
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_IG_PHOTO_KEY);
      } catch {
        // ignore
      }
      btigPush("/brightspot-taman-ig/template");
    },
    [],
  );

  const takePhoto = useCallback(() => {
    if (capturingRef.current) return;
    const video = videoRef.current;
    if (!video || !ready) return;

    const slot = nextSlotRef.current;
    if (slot < 0 || slot >= TOTAL_SHOTS) return;

    capturingRef.current = true;
    setBusy(true);
    setFlash(true);

    const dataUrl = captureFrame(video, mirror);
    if (!dataUrl) {
      capturingRef.current = false;
      setBusy(false);
      setTimeout(() => setFlash(false), 180);
      return;
    }

    // Lock this slot immediately so a double-fire can't reuse it
    nextSlotRef.current = slot + 1;

    const nextShots = [...shotsRef.current];
    nextShots[slot] = dataUrl;
    shotsRef.current = nextShots;
    setShots(nextShots);
    setTimeout(() => setFlash(false), 180);

    if (slot + 1 >= TOTAL_SHOTS) {
      setTimeout(() => {
        finishSession(nextShots.filter((s): s is string => Boolean(s)));
      }, 500);
      return;
    }

    setTimeout(() => {
      capturingRef.current = false;
      setBusy(false);
      beginCountdownRef.current();
    }, BETWEEN_SHOTS_MS);
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
        takePhoto();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [ready, allDone, clearTimer, takePhoto]);

  beginCountdownRef.current = beginCountdown;

  /** User starts once — slot 1, then auto slot 2 & 3. */
  const startSession = useCallback(() => {
    if (
      !ready ||
      sessionStartedRef.current ||
      timerRef.current ||
      busy ||
      allDone ||
      nextSlotRef.current > 0
    ) {
      return;
    }
    sessionStartedRef.current = true;
    beginCountdown();
  }, [ready, busy, allDone, beginCountdown]);

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
          src="/images/bt/bg.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 1080px) 100vw, 608px"
          className="object-cover"
        />

        <div className="absolute inset-[2.8cqw] z-10 flex flex-col items-center px-[5cqw] pb-[10cqw] pt-[10cqw]">
          <Image
            src="/images/bt/title-booth.png"
            alt="Curiosity looks good on you!"
            width={900}
            height={160}
            priority
            className="h-auto w-[75%] object-contain"
          />

          <div
            className="relative mt-[4.5cqw] w-full overflow-hidden bg-black"
            style={{ aspectRatio: `${CAPTURE_W} / ${CAPTURE_H}` }}
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: mirror ? "scaleX(-1)" : undefined }}
              playsInline
              muted
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
          </div>

          <div className="mt-[4cqw] grid w-full grid-cols-3 items-stretch gap-[2.4cqw]">
            {shots.map((shot, i) => (
              <div
                key={i}
                className="relative w-full overflow-hidden rounded-[1.4cqw] border border-white/80 bg-black/30"
                style={{ aspectRatio: `${CAPTURE_W} / ${CAPTURE_H}` }}
              >
                {shot ? (
                  <Image
                    src={shot}
                    alt={`Foto ${i + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <SlotPlaceholder index={i + 1} />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={startSession}
            disabled={!ready || countdown !== null || busy || allDone || shotCount > 0}
            aria-label="Ambil foto"
            className="mt-auto w-[88%] outline-none transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Image
              src="/images/bt/btn-capture.png"
              alt="Capture"
              width={1000}
              height={160}
              priority
              className="h-auto w-full object-contain"
            />
          </button>
        </div>

        {error && (
          <div className="absolute left-[5cqw] right-[5cqw] top-[3cqw] z-40 rounded-lg bg-red-900/85 px-3 py-2 text-center text-[clamp(0.65rem,2.6cqw,0.85rem)] text-white">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
