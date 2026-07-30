"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera2 } from "@/hooks/useCamera2";

const COUNTDOWN_SECONDS = 3;
const TOTAL_SHOTS = 3;
/** Target aspect for saved shots (1:1, matches preview). */
const OUTPUT_RATIO = 1;
/** Cap longest edge so 4K streams don't explode sessionStorage. */
const MAX_OUTPUT_LONG_EDGE = 3840;

export const BRIGHTSPOT_TAMAN_PHOTO_KEY = "brightspotTamanShot";
export const BRIGHTSPOT_TAMAN_PHOTO_URL_KEY = "brightspotTamanUploadedUrl";
export const BRIGHTSPOT_TAMAN_SHOTS_KEY = "brightspotTamanShots";
/** Dual left+right strip canvas for 4R print (dibagi 2). */
export const BRIGHTSPOT_TAMAN_PRINT_KEY = "brightspotTamanPrint";

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

  // Keep native crop size; only downscale if longer edge exceeds 4K.
  // Force exact 1:1 output (avoid off-by-one from rounding).
  let side = Math.round(Math.min(cropW, cropH));
  if (side > MAX_OUTPUT_LONG_EDGE) side = MAX_OUTPUT_LONG_EDGE;
  const outW = side;
  const outH = side;

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
    <div className="relative flex h-full w-full items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-[12%] h-auto w-[76%] text-white"
        aria-hidden
      >
        <path
          d="M18 32 V18 H32 M68 18 H82 V32 M82 68 V82 H68 M32 82 H18 V68"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="square"
        />
      </svg>
      <span className="relative z-10 text-[clamp(1.1rem,5.5cqw,1.75rem)] font-semibold text-white">
        {index}
      </span>
    </div>
  );
}

export function BrightspotTamanPhotobooth() {
  const router = useRouter();
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
      try {
        sessionStorage.setItem(
          BRIGHTSPOT_TAMAN_SHOTS_KEY,
          JSON.stringify(finalShots),
        );
        sessionStorage.setItem(BRIGHTSPOT_TAMAN_PHOTO_KEY, finalShots[0] ?? "");
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_PHOTO_URL_KEY);
        sessionStorage.removeItem(BRIGHTSPOT_TAMAN_PRINT_KEY);
      } catch {
        // sessionStorage may fail; navigate anyway
      }
      router.push("/brightspot-taman/template");
    },
    [router],
  );

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !ready || busy) return;

    const current = shotsRef.current;
    const nextIndex = current.findIndex((s) => s === null);
    if (nextIndex === -1) return;

    setBusy(true);
    setFlash(true);
    try {
      const dataUrl = captureFrame(video, mirror);
      if (!dataUrl) return;

      const nextShots = [...current];
      nextShots[nextIndex] = dataUrl;
      setShots(nextShots);

      if (nextShots.every(Boolean)) {
        setTimeout(() => {
          finishSession(nextShots.filter((s): s is string => Boolean(s)));
        }, 500);
      }
    } finally {
      setTimeout(() => setFlash(false), 180);
      setBusy(false);
    }
  }, [videoRef, ready, busy, mirror, finishSession]);

  const beginCountdown = useCallback(() => {
    if (!ready || countdown !== null || busy || allDone) return;
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
  }, [ready, countdown, busy, allDone, clearTimer, takePhoto]);

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
        beginCountdown();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beginCountdown]);

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

          <div className="relative mt-[4.5cqw] w-full overflow-hidden bg-black aspect-square">
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

          <div className="mt-[4cqw] grid w-full grid-cols-3 gap-[3cqw]">
            {shots.map((shot, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-[1.8cqw] border border-white/80 bg-black/25"
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
            onClick={beginCountdown}
            disabled={!ready || countdown !== null || busy || allDone}
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
